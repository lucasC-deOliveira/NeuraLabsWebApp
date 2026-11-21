import { expect, it } from "vitest";
import type { VaultExamHistoryPage, VaultServerAttempt } from "@contracts/provas";
import {
  downloadVaultExamHistory, importVaultExamHistoryPage, type VaultExamHistoryArchive, type VaultExamHistoryPort,
  type VaultExamHistorySummary,
} from "./download-vault-exam-history";

class FakeExamHistory implements VaultExamHistoryArchive, VaultExamHistoryPort {
  records = new Map<string, VaultServerAttempt>();
  requested: Array<string | null> = [];

  async readPage(cursor: string | null): Promise<VaultExamHistoryPage> {
    this.requested.push(cursor);
    const id = cursor === null ? "first" : "second";
    return { accountId: "account", attempts: [{ ...attempt, id }], nextCursor: cursor === null ? id : null };
  }

  async importPage(page: VaultExamHistoryPage): Promise<VaultExamHistorySummary> {
    return importVaultExamHistoryPage(page.attempts, this);
  }

  async contains(id: string): Promise<boolean> {
    return this.records.has(id);
  }

  async save(record: VaultServerAttempt): Promise<void> {
    this.records.set(record.id, record);
  }
}

const attempt: VaultServerAttempt = {
  id: "first", provaId: "exam", completedAt: "2026-11-20T20:00:00.000Z",
  acertos: 1, total: 1, tempoTotalMs: 3000,
  respostas: [{ questaoId: "question", respostaEscolhida: "V", acertou: true, tempoRespostaMs: 3000 }],
};

it("downloads all pages and preserves the complete previously saved record on retry", async () => {
  const history = new FakeExamHistory();
  history.records.set(attempt.id, attempt);
  await expect(downloadVaultExamHistory(history, () => undefined)).resolves.toEqual({ downloaded: 1, existing: 1 });
  expect(history.requested).toEqual([null, "first"]);
  expect(history.records.get(attempt.id)).toBe(attempt);
  expect(history.records.get("second")).toEqual({ ...attempt, id: "second" });
  await expect(downloadVaultExamHistory(history, () => undefined)).resolves.toEqual({ downloaded: 0, existing: 2 });
});
