import { useMemo } from "react";
import { clustersFromHierarchy, detectGaps, type Community, type StructuralGap } from "@/lib/graph-communities";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";
import type { GraphEdgeType } from "@/modules/graph/domain/types/graph.types";

export interface GapBridge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  colorA: string;
  colorB: string;
}

export interface CommunityHighlight {
  gapsOpen: boolean;
  highlightedCommunityId: string | null;
  highlightedGap: StructuralGap | null;
}

export interface GraphCommunitiesResult {
  communities: Community[];
  gaps: StructuralGap[];
  gapBridges: GapBridge[];
  highlightedCommunityNodeIds: Set<string> | null;
}

function bridgeFor(g: StructuralGap, layoutById: Map<string, SimNode>): GapBridge {
  const bA = layoutById.get(g.bridgeA.id) ?? g.bridgeA;
  const bB = layoutById.get(g.bridgeB.id) ?? g.bridgeB;
  return { x1: bA.x, y1: bA.y, x2: bB.x, y2: bB.y, colorA: g.communityA.color, colorB: g.communityB.color };
}

function computeGapBridges(gaps: StructuralGap[], layout: SimNode[]): GapBridge[] {
  const layoutById = new Map(layout.map((n) => [n.id, n]));
  return gaps.map((g) => bridgeFor(g, layoutById));
}

function highlightForCommunity(id: string, communities: Community[]): Set<string> | null {
  const c = communities.find((community) => community.id === id);
  return c ? new Set(c.nodes.map((n) => n.id)) : null;
}

function computeHighlightedIds(hl: CommunityHighlight, communities: Community[]): Set<string> | null {
  if (hl.highlightedCommunityId) return highlightForCommunity(hl.highlightedCommunityId, communities);
  if (hl.highlightedGap) {
    const { communityA, communityB } = hl.highlightedGap;
    return new Set([...communityA.nodes.map((n) => n.id), ...communityB.nodes.map((n) => n.id)]);
  }
  return null;
}

/**
 * Derives hierarchical communities + structural gaps from the current layout, plus the
 * highlight/bridge overlays the graph page draws. Cluster membership ignores positions,
 * so it recomputes only on topology change (node ids), not on every physics tick.
 */
export function useGraphCommunities(layout: SimNode[], edges: GraphEdgeType[], hl: CommunityHighlight): GraphCommunitiesResult {
  const topologyKey = useMemo(() => layout.map((n) => n.id).sort().join(","), [layout]);

  const communities = useMemo<Community[]>(
    () => (layout.length < 3 ? [] : clustersFromHierarchy(layout)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topologyKey, edges],
  );

  const gaps = useMemo<StructuralGap[]>(() => detectGaps(communities, edges), [communities, edges]);

  const gapBridges = useMemo<GapBridge[]>(
    () => (hl.gapsOpen ? computeGapBridges(gaps, layout) : []),
    [hl.gapsOpen, gaps, layout],
  );

  const highlightedCommunityNodeIds = useMemo<Set<string> | null>(
    () => computeHighlightedIds(hl, communities),
    [hl, communities],
  );

  return { communities, gaps, gapBridges, highlightedCommunityNodeIds };
}
