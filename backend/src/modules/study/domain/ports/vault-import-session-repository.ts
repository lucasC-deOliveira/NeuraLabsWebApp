// Port for creating a study session from offline (vault) data, preserving the
// original timestamps. Separate from the normal session lifecycle (offline ACL).
export interface VaultImportSessionRepository {
  createSession(userId: string, startedAt: Date, endedAt: Date): Promise<{ id: string }>;
}

export const VAULT_IMPORT_SESSION_REPOSITORY = Symbol('VAULT_IMPORT_SESSION_REPOSITORY');
