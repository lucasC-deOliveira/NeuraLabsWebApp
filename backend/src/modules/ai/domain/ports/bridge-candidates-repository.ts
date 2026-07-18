// Read port for cross-graph bridges: the concepts of the graph in view, the
// concepts of every OTHER graph of the same user, and the edges that already
// join them. `id` is the entity reference id, the same key the embedding store
// and the edge writer use.
export interface BridgeNode {
  id: string;
  nome: string;
  tipo: string;
  desc: string;
  grafoId: string;
  grafoNome: string;
}

export interface BridgeCandidatesRepository {
  loadConceptsInGraph(userId: string, grafoId: string): Promise<BridgeNode[]>;
  loadConceptsOutsideGraph(userId: string, grafoId: string): Promise<BridgeNode[]>;
  // Existing edges among the given nodes, as order-independent bridgePairKey()s.
  loadExistingPairKeys(userId: string, nodeIds: string[]): Promise<Set<string>>;
}

export const BRIDGE_CANDIDATES_REPOSITORY = Symbol('BRIDGE_CANDIDATES_REPOSITORY');
