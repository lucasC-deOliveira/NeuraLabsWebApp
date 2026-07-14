import type { NodeInsightsResult } from '../services/node-insights';

// A stored insights result plus the context signature it was generated for. The
// cache is reused only while the signature still matches the node's current
// context (see insightSignature), so it self-invalidates when the graph changes.
export interface CachedNodeInsights {
  assinatura: string;
  result: NodeInsightsResult;
}

// Persistence port for the per-node insights cache (one row per graph+node).
export interface NodeInsightsCacheRepository {
  load(grafoId: string, nodeId: string): Promise<CachedNodeInsights | null>;
  save(
    userId: string,
    grafoId: string,
    nodeId: string,
    assinatura: string,
    result: NodeInsightsResult,
  ): Promise<void>;
}

export const NODE_INSIGHTS_CACHE_REPOSITORY = Symbol('NODE_INSIGHTS_CACHE_REPOSITORY');
