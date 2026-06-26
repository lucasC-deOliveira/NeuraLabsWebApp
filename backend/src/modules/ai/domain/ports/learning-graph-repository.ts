import type { PathNode } from '../services/learning-path';

export interface LearningEdge {
  origem: string;
  destino: string;
  relacao: string;
}

export interface LearningGraph {
  nodes: PathNode[];
  edges: LearningEdge[];
}

// Read port: a graph's structural nodes and its edges (by referenciaId), used to
// order a learning path.
export interface LearningGraphRepository {
  loadLearningGraph(userId: string, grafoId: string): Promise<LearningGraph>;
}

export const LEARNING_GRAPH_REPOSITORY = Symbol('LEARNING_GRAPH_REPOSITORY');
