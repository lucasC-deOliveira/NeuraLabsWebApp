import type { GraphEdge, GraphNode } from '../services/domain-propagation';

// The renderable graph: nodes (with mastery/domain) and edges.
export interface GraphView {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Read port for loading a graph's renderable view.
export interface GraphViewRepository {
  exists(grafoId: string, userId: string): Promise<boolean>;
  loadView(userId: string, grafoId: string): Promise<GraphView>;
}

export const GRAPH_VIEW_REPOSITORY = Symbol('GRAPH_VIEW_REPOSITORY');
