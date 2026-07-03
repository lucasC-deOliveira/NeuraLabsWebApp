// Pure selectors for the edge form: which nodes can be the target/source of a new
// edge, excluding self, already-used pairs (no duplicate direction), and — for
// targets — node types that cannot relate to the source. No React, no HTTP.
import { canRelate } from "../services/relation-rules";

export interface CandidateNode {
  id: string;
  label: string;
  type: string;
}

interface EdgePair {
  id: string;
  source: string;
  target: string;
}

const usedTargetsOf = (edges: EdgePair[], sourceId: string, excludeEdgeId?: string): string[] =>
  edges.filter((e) => e.id !== excludeEdgeId && e.source === sourceId).map((e) => e.target);

const usedSourcesOf = (edges: EdgePair[], targetId: string, excludeEdgeId?: string): string[] =>
  edges.filter((e) => e.id !== excludeEdgeId && e.target === targetId).map((e) => e.source);

/** Targets available for `sourceId`: not itself, not already linked, type-compatible. */
export function availableTargets(
  nodes: CandidateNode[],
  edges: EdgePair[],
  sourceId: string,
  sourceType: string | undefined,
  excludeEdgeId?: string,
): CandidateNode[] {
  const used = usedTargetsOf(edges, sourceId, excludeEdgeId);
  return nodes.filter(
    (n) => n.id !== sourceId && !used.includes(n.id) && (!sourceType || canRelate(sourceType, n.type)),
  );
}

/** Sources available for `targetId`: not itself, not already linked to it. */
export function availableSources(
  nodes: CandidateNode[],
  edges: EdgePair[],
  targetId: string,
  excludeEdgeId?: string,
): CandidateNode[] {
  const used = usedSourcesOf(edges, targetId, excludeEdgeId);
  return nodes.filter((n) => n.id !== targetId && !used.includes(n.id));
}
