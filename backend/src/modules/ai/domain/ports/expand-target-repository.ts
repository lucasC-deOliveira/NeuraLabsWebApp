export interface ExpandTarget {
  tipo: string;
  nome: string;
  desc: string;
}

// Read port: the node to expand (its type, name and description/content). Returns
// null when the node is not part of the graph.
export interface ExpandTargetRepository {
  loadExpandTarget(userId: string, grafoId: string, nodeId: string): Promise<ExpandTarget | null>;
}

export const EXPAND_TARGET_REPOSITORY = Symbol('EXPAND_TARGET_REPOSITORY');
