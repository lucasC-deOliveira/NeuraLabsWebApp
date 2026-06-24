import type { VaultEdge, VaultNode } from '../services/vault-sync';

export interface VaultPayload {
  nodes: VaultNode[];
  edges: VaultEdge[];
}

export interface VaultSyncResult {
  created: number;
  updated: number;
  edges: number;
  removed: number;
}

// Persistence port for the desktop vault Push: upsert nodes by id, replace edges,
// and unlink nodes whose file disappeared (entities + SRS preserved).
export interface VaultSyncRepository {
  graphExists(grafoId: string, userId: string): Promise<boolean>;
  syncFromVault(userId: string, grafoId: string, payload: VaultPayload): Promise<VaultSyncResult>;
}

export const VAULT_SYNC_REPOSITORY = Symbol('VAULT_SYNC_REPOSITORY');
