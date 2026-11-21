import { z } from "zod";
import type { ExamProgress, ExamProgressPort } from "../../application/ports/graph-prova.port";

export interface VaultExamProgressFiles {
  readFile(dir: string, relPath: string): Promise<string | null>;
  writeFile(dir: string, relPath: string, content: string): Promise<{ ok: boolean }>;
}

const progressRecord = z.object({
  version: z.literal(1),
  progress: z.object({
    attemptId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    questionKey: z.string(),
    index: z.number().int().nonnegative(),
    selected: z.string().nullable(),
    revealed: z.boolean(),
    totalSeconds: z.number().int().nonnegative(),
    questionSeconds: z.number().int().nonnegative(),
    answers: z.array(z.object({
      questaoId: z.string(),
      respostaEscolhida: z.string(),
      acertou: z.boolean(),
      tempoRespostaMs: z.number().nonnegative().nullable(),
    })),
  }),
});

const pendingWrites = new Map<string, Promise<unknown>>();

function enqueueExamWrite<T>(key: string, write: () => Promise<T>): Promise<T> {
  const pending = Promise.resolve(pendingWrites.get(key)).catch(() => undefined).then(write);
  pendingWrites.set(key, pending);
  return pending.finally(() => {
    if (pendingWrites.get(key) === pending) pendingWrites.delete(key);
  });
}

function examProgressPath(examId: string): string {
  return `.neuralabs-exam-progress/${encodeURIComponent(examId)}.json`;
}

async function readExamProgress(files: VaultExamProgressFiles, directory: string, path: string): Promise<ExamProgress | null> {
  const raw = await files.readFile(directory, path);
  if (raw === null) return null;
  const { progress } = progressRecord.parse(JSON.parse(raw));
  const completed = await files.readFile(directory, `.neuralabs-exam-attempts/${progress.attemptId}.json`);
  return completed === null ? progress : null;
}

/** Stores resumable quiz checkpoints in the same graph as the exam.
 * @example makeVaultExamProgress(files, directory, writeAttempt).read(examId)
 */
export function makeVaultExamProgress(
  files: VaultExamProgressFiles, directory: string, finish: ExamProgressPort["finish"],
): ExamProgressPort {
  const queueKey = (examId: string): string => `${directory}/${examProgressPath(examId)}`;
  return {
    read: (examId) => enqueueExamWrite(queueKey(examId), () => readExamProgress(files, directory, examProgressPath(examId))),
    save: (examId, progress) => enqueueExamWrite(queueKey(examId), async () => {
      const contents = JSON.stringify({ version: 1, progress }) + "\n";
      const result = await files.writeFile(directory, examProgressPath(examId), contents);
      if (!result.ok) throw new Error(`Cannot write exam progress for "${examId}". Expected a writable vault.`);
    }),
    finish: (examId, attemptId, attempt) => enqueueExamWrite(queueKey(examId), () => finish(examId, attemptId, attempt)),
  };
}
