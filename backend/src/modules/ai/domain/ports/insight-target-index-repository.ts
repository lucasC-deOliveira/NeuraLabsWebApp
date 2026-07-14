// The source node's type plus an index of existing structural nodes keyed by the
// shared dedup key (nodeNameKey: tipo + accent-free, single-spaced, lowercased
// name) → referenciaId, used to reuse nodes instead of duplicating.
export interface InsightTargetContext {
  sourceType: string;
  nameIndex: Map<string, string>;
}

// Read port: resolves the source node type and the existing-node name index for
// applying insights. Returns null when the source node is not in the graph.
export interface InsightTargetIndexRepository {
  loadInsightTargetContext(
    userId: string,
    grafoId: string,
    sourceNodeId: string,
  ): Promise<InsightTargetContext | null>;
}

export const INSIGHT_TARGET_INDEX_REPOSITORY = Symbol('INSIGHT_TARGET_INDEX_REPOSITORY');
