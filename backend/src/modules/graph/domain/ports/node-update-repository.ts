import type { NodeUpdateData } from '../services/node-update';

// Persistence port for editing a node's referenced entity.
export interface NodeUpdateRepository {
  // Applies the partial update to the typed entity; returns how many rows changed.
  updateNode(
    userId: string,
    tipoNode: string,
    refId: string,
    data: NodeUpdateData,
  ): Promise<{ updated: number }>;
}

export const NODE_UPDATE_REPOSITORY = Symbol('NODE_UPDATE_REPOSITORY');
