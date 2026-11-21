import { expect, it } from "vitest";
import { syncVaultExamAttempts, type VaultExamAttemptSyncPort, type VaultExamDelivery } from "./sync-vault-exam-attempts";

class FakeExamDelivery implements VaultExamAttemptSyncPort {
  visited: string[] = [];

  constructor(private readonly deliveries: Record<string, VaultExamDelivery>) {}

  async list(): Promise<string[]> {
    return Object.keys(this.deliveries);
  }

  async send(file: string): Promise<VaultExamDelivery> {
    this.visited.push(file);
    return this.deliveries[file];
  }
}

it("counts new and previously confirmed attempts and continues after an invalid file", async () => {
  const vault = new FakeExamDelivery({
    invalid: { status: "failed", message: "Invalid file" },
    retry: { status: "alreadyRecorded" },
    new: { status: "sent" },
  });
  const progress: number[][] = [];
  await expect(syncVaultExamAttempts(vault, (current, total) => progress.push([current, total]))).resolves.toEqual({
    sent: 1, alreadyRecorded: 1, pending: 1, issues: [{ file: "invalid", message: "Invalid file" }],
  });
  expect(progress).toEqual([[1, 3], [2, 3], [3, 3]]);
});

it("leaves unread attempts pending when the server connection is interrupted", async () => {
  const vault = new FakeExamDelivery({
    first: { status: "sent" }, second: { status: "paused", message: "Unavailable" }, third: { status: "sent" },
  });
  await expect(syncVaultExamAttempts(vault, () => undefined)).resolves.toMatchObject({ sent: 1, pending: 2 });
  expect(vault.visited).toEqual(["first", "second"]);
});
