import type { GraphView } from './graph-view-repository';

// A stored graph view plus the signature it was built for. Reused only while the
// signature still matches the graph's current state, so it self-invalidates.
export interface CachedGraphView {
  assinatura: string;
  view: GraphView;
}

// Persistence port for the built graph-view cache (one row per graph).
export interface GraphViewCacheRepository {
  // Cheap signature of the graph's current state (counts + max timestamps). When
  // it matches the cached one, the stored view is still valid.
  currentSignature(userId: string, grafoId: string): Promise<string>;
  load(grafoId: string): Promise<CachedGraphView | null>;
  save(userId: string, grafoId: string, assinatura: string, view: GraphView): Promise<void>;
}

export const GRAPH_VIEW_CACHE_REPOSITORY = Symbol('GRAPH_VIEW_CACHE_REPOSITORY');
