import type { CompositionGraph } from '../composition-views';

export interface ComposeResult {
  nodes: number;
  edges: number;
}

// Mescla o subgrafo composto de um item num grafo existente, reusando as regras
// do grafo (nó único por referência, aresta deduplicada). null se o grafo não é
// do usuário.
export interface ComposeIntoGraphRepository {
  compose(userId: string, grafoId: string, graph: CompositionGraph): Promise<ComposeResult | null>;
}

export const COMPOSE_INTO_GRAPH_REPOSITORY = Symbol('COMPOSE_INTO_GRAPH_REPOSITORY');
