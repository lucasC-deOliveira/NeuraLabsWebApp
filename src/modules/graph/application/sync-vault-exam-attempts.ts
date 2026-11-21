export type VaultExamDelivery =
  | { status: "sent" | "alreadyRecorded" }
  | { status: "failed" | "paused"; message: string };

export interface VaultExamAttemptSyncPort {
  list(): Promise<string[]>;
  send(file: string): Promise<VaultExamDelivery>;
}

export interface VaultExamSyncSummary {
  sent: number;
  alreadyRecorded: number;
  pending: number;
  issues: Array<{ file: string; message: string }>;
}

/** Uploads completed exams and leaves every local attempt available for retry.
 * @example await syncVaultExamAttempts(vault, (done, total) => report(done, total))
 */
export async function syncVaultExamAttempts(
  vault: VaultExamAttemptSyncPort, report: (done: number, total: number) => void,
): Promise<VaultExamSyncSummary> {
  const files = await vault.list();
  const summary: VaultExamSyncSummary = { sent: 0, alreadyRecorded: 0, pending: files.length, issues: [] };
  for (const [index, file] of files.entries()) {
    report(index + 1, files.length);
    const delivery = await vault.send(file);
    if ("message" in delivery) summary.issues.push({ file, message: delivery.message });
    if (delivery.status === "paused") break;
    if (delivery.status === "failed") continue;
    summary[delivery.status]++;
    summary.pending--;
  }
  return summary;
}
