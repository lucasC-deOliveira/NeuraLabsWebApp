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
  // Bumps the modified timestamp of the node(s) referencing refId so the graph
  // view cache invalidates when the entity's content/label changes (the entity
  // edit itself doesn't touch NodeConhecimento).
  touchNodes(userId: string, refId: string): Promise<void>;
}

export const NODE_UPDATE_REPOSITORY = Symbol('NODE_UPDATE_REPOSITORY');
