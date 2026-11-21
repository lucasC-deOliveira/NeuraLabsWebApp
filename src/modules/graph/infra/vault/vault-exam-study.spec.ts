import { describe, expect, it } from "vitest";
import { serializeNode, type VaultNode } from "@/lib/vault-format";
import type { ExamProgress } from "../../application/ports/graph-prova.port";
import type { VaultExamProgressFiles } from "./vault-exam-progress";
import { makeVaultExamStudy } from "./vault-exam-study";

class FakeExamAttemptFiles implements VaultExamProgressFiles {
  writes = new Map<string, string>();
  failAttempt = false;

  async readFile(directory: string, relPath: string): Promise<string | null> {
    return this.writes.get(`${directory}/${relPath}`) ?? null;
  }

  async writeFile(directory: string, relPath: string, contents: string): Promise<{ ok: boolean }> {
    if (this.failAttempt && relPath.startsWith(".neuralabs-exam-attempts/")) return { ok: false };
    this.writes.set(`${directory}/${relPath}`, contents);
    return { ok: true };
  }
}

const question: VaultNode = {
  id: "q1", grafoId: "g1", tipo: "QUESTION", tipoQuestao: "VERDADEIRO_FALSO",
  enunciado: "Question one", gabarito: "V", explicacao: "Explanation", relacoes: [],
};
const exam: VaultNode = {
  id: "exam-1", grafoId: "g1", tipo: "PROVA", titulo: "Biology",
  relacoes: ["q2", "q1", "missing"].map((alvo) => ({ rel: "CONTEM", alvo, peso: 1 })),
};
const source = {
  directory: "/vault/biology",
  entries: [exam, question, { ...question, id: "q2" }].map((node) => ({
    node, file: { relPath: `Resources/${node.id}.md`, content: serializeNode(node) },
  })),
};

const checkpoint: ExamProgress = {
  attemptId: "resumed-1", questionKey: '[["q2","V"],["q1","V"]]', index: 1,
  selected: "V", revealed: true, totalSeconds: 18, questionSeconds: 7,
  answers: [{ questaoId: "q1", respostaEscolhida: "V", acertou: true, tempoRespostaMs: 5000 }],
};

describe("vault exam study", () => {
  it("reads the linked questions in manifest relation order and skips missing nodes", async () => {
    const study = makeVaultExamStudy("g1", source, new FakeExamAttemptFiles());
    const exam = await study.getProva("exam-1");
    expect(exam?.questoes.map(({ id }) => id)).toEqual(["q2", "q1"]);
    expect(await study.getQuestao("q1")).toMatchObject({ tipo: "VERDADEIRO_FALSO", explicacao: "Explanation" });
    expect(await study.getQuestao("missing")).toBeNull();
  });

  it("prefers the downloaded exam order over graph edges", async () => {
    const ordered = { ...exam, questaoIds: ["q1", "q2"] };
    const entries = [{ ...source.entries[0], node: ordered }, ...source.entries.slice(1)];
    const study = makeVaultExamStudy("g1", { ...source, entries }, new FakeExamAttemptFiles());
    const result = await study.getProva("exam-1");
    expect(result?.questoes.map(({ id }) => id)).toEqual(["q1", "q2"]);
  });

  it("explains when a legacy download is missing the exam membership", async () => {
    const legacy = { ...exam, relacoes: [] };
    const entries = [{ ...source.entries[0], node: legacy }, ...source.entries.slice(1)];
    const study = makeVaultExamStudy("g1", { ...source, entries }, new FakeExamAttemptFiles());
    await expect(study.getProva("exam-1")).rejects.toThrow("Baixe o grafo novamente");
  });

  it("persists a completed attempt and its answers as a vault file", async () => {
    const files = new FakeExamAttemptFiles();
    const study = makeVaultExamStudy("g1", source, files, () => "attempt-1");
    const attempt = {
      acertos: 1, total: 1, tempoTotalMs: 4000,
      respostas: [{ questaoId: "q1", respostaEscolhida: "V", acertou: true, tempoRespostaMs: 4000 }],
    };
    await expect(study.recordProvaAttempt("exam-1", attempt)).resolves.toEqual({ id: "attempt-1" });
    const saved = files.writes.get("/vault/biology/.neuralabs-exam-attempts/attempt-1.json");
    expect(JSON.parse(saved ?? "")).toMatchObject({ ...attempt, graphId: "g1", provaId: "exam-1" });
  });

  it("restores the latest queued checkpoint through a new adapter", async () => {
    const files = new FakeExamAttemptFiles();
    const first = makeVaultExamStudy("g1", source, files).progress!;
    const reopened = makeVaultExamStudy("g1", source, files).progress!;
    const earlier = first.save("exam-1", { ...checkpoint, totalSeconds: 10 });
    const latest = first.save("exam-1", checkpoint);
    await expect(reopened.read("exam-1")).resolves.toEqual(checkpoint);
    await Promise.all([earlier, latest]);
    await expect(reopened.read("exam-2")).resolves.toBeNull();
  });

  it("keeps progress after a failed finish and stops resuming after retry", async () => {
    const files = new FakeExamAttemptFiles();
    const progress = makeVaultExamStudy("g1", source, files).progress!;
    const attempt = { acertos: 1, total: 2, tempoTotalMs: 18_000, respostas: checkpoint.answers };
    await progress.save("exam-1", checkpoint);
    files.failAttempt = true;
    await expect(progress.finish("exam-1", checkpoint.attemptId, attempt)).rejects.toThrow();
    await expect(progress.read("exam-1")).resolves.toEqual(checkpoint);
    files.failAttempt = false;
    await progress.finish("exam-1", checkpoint.attemptId, attempt);
    await progress.finish("exam-1", checkpoint.attemptId, attempt);
    await expect(progress.read("exam-1")).resolves.toBeNull();
    expect([...files.writes.keys()].filter((key) => key.includes("exam-attempts"))).toHaveLength(1);
  });
});
