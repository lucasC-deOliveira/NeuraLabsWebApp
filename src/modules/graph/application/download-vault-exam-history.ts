import type { VaultExamHistoryPage, VaultServerAttempt } from "@contracts/provas";

export interface VaultExamHistoryPort {
  readPage(cursor: string | null): Promise<VaultExamHistoryPage>;
  importPage(page: VaultExamHistoryPage): Promise<VaultExamHistorySummary>;
}

export interface VaultExamHistorySummary {
  downloaded: number;
  existing: number;
}

/** Downloads immutable completed attempts page by page.
 * @example await downloadVaultExamHistory(port, (summary) => showStatus(summary))
 */
export async function downloadVaultExamHistory(
  port: VaultExamHistoryPort, report: (summary: VaultExamHistorySummary) => void,
): Promise<VaultExamHistorySummary> {
  let cursor: string | null = null;
  const summary = { downloaded: 0, existing: 0 };
  do {
    const page = await port.readPage(cursor);
    const imported = await port.importPage(page);
    summary.downloaded += imported.downloaded;
    summary.existing += imported.existing;
    report({ ...summary });
    cursor = page.nextCursor;
  } while (cursor !== null);
  return summary;
}

export interface VaultExamHistoryArchive {
  contains(id: string): Promise<boolean>;
  save(attempt: VaultServerAttempt): Promise<void>;
}

/** Adds server attempts that are missing locally, leaving existing files intact.
 * @example await importVaultExamHistoryPage(attempts, archive)
 */
export async function importVaultExamHistoryPage(
  attempts: VaultServerAttempt[], archive: VaultExamHistoryArchive,
): Promise<VaultExamHistorySummary> {
  const summary = { downloaded: 0, existing: 0 };
  for (const attempt of attempts) {
    if (await archive.contains(attempt.id)) {
      summary.existing++;
      continue;
    }
    await archive.save(attempt);
    summary.downloaded++;
  }
  return summary;
}
