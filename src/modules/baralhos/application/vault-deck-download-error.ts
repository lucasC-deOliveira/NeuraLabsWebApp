export type VaultDeckDownloadFailure =
  | "vault-not-configured"
  | "session-required"
  | "server-unavailable"
  | "deck-unavailable"
  | "schedule-unavailable"
  | "vault-write-failed";

export class VaultDeckDownloadError extends Error {
  constructor(readonly reason: VaultDeckDownloadFailure, message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "VaultDeckDownloadError";
  }
}
