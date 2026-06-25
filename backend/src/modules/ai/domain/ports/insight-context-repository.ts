// A node's display content for insight prompts.
export interface InsightContextNode {
  id: string;
  tipo: string;
  nome: string;
  corpo?: string;
}

// The target node plus its direct neighbors and the remaining graph nodes.
export interface InsightContext {
  targetTipo: string;
  target: InsightContextNode;
  neighbors: InsightContextNode[];
  others: InsightContextNode[];
}

// Read port: assembles the context around a node for insight generation. Returns
// null when the target node is not in the graph (or has no resolvable content).
export interface InsightContextRepository {
  loadInsightContext(
    userId: string,
    grafoId: string,
    nodeId: string,
  ): Promise<InsightContext | null>;
}

export const INSIGHT_CONTEXT_REPOSITORY = Symbol('INSIGHT_CONTEXT_REPOSITORY');
