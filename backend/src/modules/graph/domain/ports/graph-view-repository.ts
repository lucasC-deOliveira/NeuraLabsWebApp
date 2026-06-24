import type { GraphEdge, GraphNode } from '../services/domain-propagation';

// The renderable graph: nodes (with mastery/domain) and edges.
export interface GraphView {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Read/maintenance port for loading a graph's view. ensureRoot lazily creates the
// root subject for graphs predating that feature (idempotent).
export interface GraphViewRepository {
  exists(grafoId: string, userId: string): Promise<boolean>;
  ensureRoot(userId: string, grafoId: string): Promise<void>;
  loadView(userId: string, grafoId: string): Promise<GraphView>;
}

export const GRAPH_VIEW_REPOSITORY = Symbol('GRAPH_VIEW_REPOSITORY');
