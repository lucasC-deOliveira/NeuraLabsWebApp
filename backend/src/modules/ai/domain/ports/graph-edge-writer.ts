// Published write capability of the graph context used by the AI context: creates
// a single edge. Throws on a duplicate/invalid edge. Bound to the graph's
// CreateEdge use-case in the AI module.
export interface GraphEdgeInput {
  sourceNodeId: string;
  targetNodeId: string;
  tipoRelacao: string;
}

export interface GraphEdgeWriter {
  createEdge(userId: string, grafoId: string, edge: GraphEdgeInput): Promise<void>;
}

export const GRAPH_EDGE_WRITER = Symbol('GRAPH_EDGE_WRITER');
