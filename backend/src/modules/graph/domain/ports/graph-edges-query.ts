// Read model for an edge in the graph view: endpoints (by referenciaId) plus a
// short human label for each side, resolved from the referenced entity.
export interface GraphEdgeView {
  id: string;
  source: string;
  target: string;
  tipoRelacao: string;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}

// Read port: the edges of a graph whose both endpoints are owned by the user.
export interface GraphEdgesQuery {
  listForGraph(userId: string, grafoId: string): Promise<GraphEdgeView[]>;
}

export const GRAPH_EDGES_QUERY = Symbol('GRAPH_EDGES_QUERY');
