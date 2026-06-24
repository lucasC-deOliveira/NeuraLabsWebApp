import { GraphNotFoundError } from '../../domain/errors';
import type {
  VaultPayload,
  VaultSyncRepository,
  VaultSyncResult,
} from '../../domain/ports/vault-sync-repository';

/**
 * Syncs a graph from the desktop vault (Push): upserts nodes by id, replaces the
 * edges, and unlinks nodes whose file vanished.
 * @example syncVault.execute('u1', 'g1', { nodes, edges })
 */
export class SyncVaultUseCase {
  constructor(private readonly vault: VaultSyncRepository) {}

  async execute(userId: string, grafoId: string, payload: VaultPayload): Promise<VaultSyncResult> {
    if (!(await this.vault.graphExists(grafoId, userId))) throw new GraphNotFoundError();
    return this.vault.syncFromVault(userId, grafoId, payload);
  }
}
