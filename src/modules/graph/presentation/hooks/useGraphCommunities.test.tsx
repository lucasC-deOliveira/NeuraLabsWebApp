import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { clustersFromHierarchy, detectGaps } from "@/lib/graph-communities";
import { useGraphCommunities, type CommunityHighlight } from "./useGraphCommunities";

vi.mock("@/lib/graph-communities", () => ({ clustersFromHierarchy: vi.fn(), detectGaps: vi.fn() }));

const nodeA = { id: "a", x: 1, y: 2 };
const nodeB = { id: "b", x: 3, y: 4 };
const community = { id: "c1", color: "#f00", nodes: [nodeA, nodeB] };
const layout = [nodeA, nodeB, { id: "c", x: 5, y: 6 }] as never;

const noHighlight: CommunityHighlight = { gapsOpen: false, highlightedCommunityId: null, highlightedGap: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clustersFromHierarchy).mockReturnValue([community] as never);
  vi.mocked(detectGaps).mockReturnValue([] as never);
});

describe("useGraphCommunities", () => {
  it("derives communities and gaps from the layout", () => {
    const { result } = renderHook(() => useGraphCommunities(layout, [] as never, noHighlight));
    expect(clustersFromHierarchy).toHaveBeenCalled();
    expect(result.current.communities).toEqual([community]);
    expect(result.current.gaps).toEqual([]);
  });

  it("returns no communities when there are fewer than 3 nodes", () => {
    const { result } = renderHook(() => useGraphCommunities([nodeA] as never, [] as never, noHighlight));
    expect(clustersFromHierarchy).not.toHaveBeenCalled();
    expect(result.current.communities).toEqual([]);
  });

  it("highlights a community's node ids when hovered", () => {
    const hl: CommunityHighlight = { gapsOpen: false, highlightedCommunityId: "c1", highlightedGap: null };
    const { result } = renderHook(() => useGraphCommunities(layout, [] as never, hl));
    expect(result.current.highlightedCommunityNodeIds).toEqual(new Set(["a", "b"]));
  });

  it("computes bridge overlays only when the gaps panel is open", () => {
    vi.mocked(detectGaps).mockReturnValue([
      { bridgeA: nodeA, bridgeB: nodeB, communityA: { color: "#f00" }, communityB: { color: "#0f0" } },
    ] as never);
    const closed = renderHook(() => useGraphCommunities(layout, [] as never, noHighlight));
    expect(closed.result.current.gapBridges).toEqual([]);

    const open = renderHook(() => useGraphCommunities(layout, [] as never, { ...noHighlight, gapsOpen: true }));
    expect(open.result.current.gapBridges).toEqual([
      { x1: 1, y1: 2, x2: 3, y2: 4, colorA: "#f00", colorB: "#0f0" },
    ]);
  });
});
