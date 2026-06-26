import { describe, it, expect, beforeEach } from 'vitest';
import { SyncVaultUseCase } from './sync-vault.use-case';
import { GraphNotFoundError } from '../../domain/errors';
import type {
  VaultPayload,
  VaultSyncRepository,
  VaultSyncResult,
} from '../../domain/ports/vault-sync-repository';

class FakeVaultSyncRepository implements VaultSyncRepository {
  graphs = new Set<string>();
  synced: VaultPayload | null = null;
  async graphExists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async syncFromVault(_u: string, _g: string, payload: VaultPayload): Promise<VaultSyncResult> {
    this.synced = payload;
    return { created: 1, updated: 0, edges: 0, removed: 0 };
  }
}

const payload: VaultPayload = { nodes: [], edges: [] };

describe('SyncVaultUseCase', () => {
  let repo: FakeVaultSyncRepository;
  let useCase: SyncVaultUseCase;

  beforeEach(() => {
    repo = new FakeVaultSyncRepository();
    repo.graphs.add('g1');
    useCase = new SyncVaultUseCase(repo);
  });

  it('syncs when the graph exists', async () => {
    const res = await useCase.execute('u1', 'g1', payload);
    expect(res).toEqual({ created: 1, updated: 0, edges: 0, removed: 0 });
    expect(repo.synced).toBe(payload);
  });

  it('throws when the graph does not exist', async () => {
    await expect(useCase.execute('u1', 'missing', payload)).rejects.toBeInstanceOf(
      GraphNotFoundError,
    );
    expect(repo.synced).toBeNull();
  });
});
