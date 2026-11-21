import type { VaultExamHistoryPage, VaultServerAttempt } from "@contracts/provas";
import { getToken, resolveApiUrl } from "@/lib/api";
import { readVaultProvaHistory } from "@/lib/provas-api";
import { desktop } from "@/lib/vault-bridge";
import {
  importVaultExamHistoryPage, type VaultExamHistoryArchive, type VaultExamHistoryPort, type VaultExamHistorySummary,
} from "../../application/download-vault-exam-history";
import { listVaultExamAttempts } from "./vault-exam-attempt-sync";

async function linkedServerAttemptId(accountId: string, localId: string): Promise<string> {
  // Matches the server's stable upload identity, including attempts sent before downloads existed.
  const payload = new TextEncoder().encode(JSON.stringify([accountId, localId]));
  const hash = await crypto.subtle.digest("SHA-256", payload);
  const hex = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `vault-${hex}`;
}

async function knownAttemptIds(files: string[], accountId: string): Promise<Set<string>> {
  const serverIds = files.flatMap((file) => /\/server-([\w-]+)\.json$/.exec(file)?.[1] ?? []);
  const localIds = files.flatMap((file) => /\/([a-f0-9-]{36})\.json$/i.exec(file)?.[1] ?? []);
  const uploadedIds = await Promise.all(localIds.map((id) => linkedServerAttemptId(accountId, id)));
  return new Set([...serverIds, ...uploadedIds]);
}

function serverAttemptPath(id: string): string {
  return `.neuralabs-exam-attempts/server-${id}.json`;
}

async function makeHistoryArchive(
  directory: string, graphId: string, accountId: string, assertSession: () => void,
): Promise<VaultExamHistoryArchive> {
  const known = await knownAttemptIds(await listVaultExamAttempts(directory), accountId);
  return {
    async contains(id): Promise<boolean> {
      return known.has(id);
    },
    async save(attempt: VaultServerAttempt): Promise<void> {
      assertSession();
      const record = { version: 1, graphId, source: "server", ...attempt };
      const result = await desktop.vault.writeFile(directory, serverAttemptPath(attempt.id), JSON.stringify(record) + "\n");
      if (!result.ok) throw new Error(`Cannot save attempt "${attempt.id}". Expected a writable vault.`);
      known.add(attempt.id);
    },
  };
}

/** Connects the server's completed attempts to the currently opened vault graph.
 * @example const port = makeVaultExamHistory(directory, graphId)
 */
export function makeVaultExamHistory(directory: string, graphId: string): VaultExamHistoryPort {
  const token = getToken();
  const server = resolveApiUrl();
  let archive: VaultExamHistoryArchive | undefined;
  function assertSession(): void {
    if (!token || token !== getToken() || server !== resolveApiUrl())
      throw new Error("Invalid history session. Expected the original signed-in server account.");
  }
  return {
    readPage(cursor): Promise<VaultExamHistoryPage> {
      assertSession();
      return readVaultProvaHistory(graphId, cursor);
    },
    async importPage(page): Promise<VaultExamHistorySummary> {
      assertSession();
      archive ??= await makeHistoryArchive(directory, graphId, page.accountId, assertSession);
      return importVaultExamHistoryPage(page.attempts, archive);
    },
  };
}
