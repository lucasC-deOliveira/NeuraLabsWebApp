// Persistence port for a node's membership in a graph (NodeConhecimento link).
export interface GraphNodeRepository {
  graphExists(grafoId: string, userId: string): Promise<boolean>;
  addNodeLink(grafoId: string, userId: string, tipoNode: string, entityId: string): Promise<void>;
  findNodeInGraph(grafoId: string, userId: string, refId: string): Promise<{ id: string } | null>;
  // Removes the link, its edges and performance rows (keeps the entity).
  removeNodeLink(nodeId: string): Promise<void>;
}

export const GRAPH_NODE_REPOSITORY = Symbol('GRAPH_NODE_REPOSITORY');
