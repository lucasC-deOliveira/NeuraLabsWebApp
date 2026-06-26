// A node as referenced within a graph (link id + its node type).
export interface GraphNodeRef {
  id: string;
  tipoNode: string;
}

export interface CreateEdgeData {
  grafoId: string;
  sourceNodeId: string;
  targetNodeId: string;
  tipoRelacao: string;
  peso: number;
}

// Persistence port for graph edges (ConhecimentoAresta).
export interface GraphEdgeRepository {
  // The node linked into the graph for a given entity (referenciaId), owned by the user.
  findNodeInGraph(
    grafoId: string,
    userId: string,
    referenciaId: string,
  ): Promise<GraphNodeRef | null>;
  edgeExists(
    grafoId: string,
    sourceNodeId: string,
    targetNodeId: string,
    tipoRelacao: string,
  ): Promise<boolean>;
  createEdge(data: CreateEdgeData): Promise<{ id: string }>;
  // An edge of the graph owned by the user (via its source node), or null.
  findOwnedEdge(grafoId: string, edgeId: string, userId: string): Promise<{ id: string } | null>;
  updateEdge(edgeId: string, data: { tipoRelacao?: string; peso?: number }): Promise<void>;
  deleteEdge(edgeId: string): Promise<void>;
}

export const GRAPH_EDGE_REPOSITORY = Symbol('GRAPH_EDGE_REPOSITORY');
