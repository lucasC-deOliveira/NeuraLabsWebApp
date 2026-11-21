import { vaultServerAttempt } from "@contracts/provas";
import { desktop, type VaultGraphFolder } from "@/lib/vault-bridge";
import type { StudySessionEntry } from "../domain/dashboard.types";

const attemptFile = vaultServerAttempt.extend({ graphId: vaultServerAttempt.shape.id });

function decodeAttempt(raw: string | null, graphId: string, titles: ReadonlyMap<string, string>): StudySessionEntry | null {
  if (raw === null) return null;
  const result = attemptFile.safeParse(JSON.parse(raw));
  if (!result.success || result.data.graphId !== graphId) return null;
  const attempt = result.data;
  const completed = new Date(attempt.completedAt);
  return {
    id: `exam-${attempt.id}`, examTitle: titles.get(attempt.provaId) ?? "Prova",
    dataInicio: completed, dataFim: completed,
    totalReviews: attempt.total, correctCount: attempt.acertos,
    incorrectCount: attempt.total - attempt.acertos, avgConfidence: 0,
  };
}

/** Reads the completed attempt archive of one downloaded graph.
 * @example const archive = await readVaultDashboardAttempts(folder, examTitles)
 */
export async function readVaultDashboardAttempts(
  folder: VaultGraphFolder, titles: ReadonlyMap<string, string>,
): Promise<{ entries: StudySessionEntry[]; incomplete: boolean }> {
  const paths = desktop.vault.listExamAttempts(folder.directory);
  if (paths === null) return { entries: [], incomplete: true };
  const records = await Promise.allSettled((await paths).map(async (path) =>
    decodeAttempt(await desktop.vault.readFile(folder.directory, path), folder.id, titles)));
  const entries = records.flatMap((record) => record.status === "fulfilled" && record.value ? [record.value] : []);
  return { entries, incomplete: records.length !== entries.length };
}
