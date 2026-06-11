import { describe, it, expect } from "vitest";
import {
  getFilteredNodes,
  getVisibleNodeIds,
  getFilteredEdges,
  getNodeStats,
  getConnectedNodeIds,
} from "./graph.selectors";

const nodes = [
  { id: "n1", x: 0, y: 0, group: "ASSUNTO", type: "ASSUNTO" },
  { id: "n2", x: 10, y: 10, group: "TOPICO", type: "TOPICO" },
  { id: "n3", x: 20, y: 20, group: "CONCEITO", type: "CONCEITO" },
  { id: "n4", x: 30, y: 30, group: "CONCEITO", type: "CONCEITO" },
];

const edges = [
  { source: "n1", target: "n2" },
  { source: "n2", target: "n3" },
  { source: "n3", target: "n4" },
];

describe("getFilteredNodes", () => {
  it("returns all nodes when filterGroup is null", () => {
    expect(getFilteredNodes(nodes, null)).toHaveLength(4);
  });

  it("filters to only matching group", () => {
    const result = getFilteredNodes(nodes, "CONCEITO");
    expect(result).toHaveLength(2);
    expect(result.every((n) => n.group === "CONCEITO")).toBe(true);
  });

  it("returns empty array when no nodes match group", () => {
    expect(getFilteredNodes(nodes, "FLASHCARD")).toHaveLength(0);
  });

  // Mutation: ensure filter is exact match, not partial
  it("does not match partial group names", () => {
    expect(getFilteredNodes(nodes, "ASSUN")).toHaveLength(0);
  });
});

describe("getVisibleNodeIds", () => {
  it("returns a Set of all node ids", () => {
    const ids = getVisibleNodeIds(nodes);
    expect(ids.size).toBe(4);
    expect(ids.has("n1")).toBe(true);
    expect(ids.has("n3")).toBe(true);
  });

  it("returns empty Set for empty input", () => {
    expect(getVisibleNodeIds([])).toEqual(new Set());
  });
});

describe("getFilteredEdges", () => {
  const visibleIds = new Set(["n1", "n2", "n3", "n4"]);

  it("returns edges with source/target coordinates resolved from layout", () => {
    const result = getFilteredEdges(edges, nodes, visibleIds);
    expect(result).toHaveLength(3);
    const first = result[0];
    expect(first.sourceX).toBe(0); // n1.x
    expect(first.targetX).toBe(10); // n2.x
  });

  it("excludes edges where source is not visible", () => {
    const limited = new Set(["n2", "n3", "n4"]);
    const result = getFilteredEdges(edges, nodes, limited);
    expect(result.every((e) => e.source !== "n1")).toBe(true);
  });

  it("excludes edges where target is not visible", () => {
    const limited = new Set(["n1", "n2", "n3"]);
    const result = getFilteredEdges(edges, nodes, limited);
    expect(result.find((e) => e.target === "n4")).toBeUndefined();
  });

  it("returns empty array when visibleIds is empty", () => {
    expect(getFilteredEdges(edges, nodes, new Set())).toHaveLength(0);
  });
});

describe("getNodeStats", () => {
  it("counts nodes by type", () => {
    const stats = getNodeStats(nodes);
    expect(stats.ASSUNTO).toBe(1);
    expect(stats.TOPICO).toBe(1);
    expect(stats.CONCEITO).toBe(2);
  });

  it("returns empty object for empty input", () => {
    expect(getNodeStats([])).toEqual({});
  });
});

describe("getConnectedNodeIds", () => {
  it("returns empty set when no activeId", () => {
    expect(getConnectedNodeIds(nodes, edges, null)).toEqual(new Set());
  });

  it("includes the active node itself", () => {
    const connected = getConnectedNodeIds(nodes, edges, "n2");
    expect(connected.has("n2")).toBe(true);
  });

  it("includes direct neighbours (source and target)", () => {
    const connected = getConnectedNodeIds(nodes, edges, "n2");
    expect(connected.has("n1")).toBe(true); // n1 → n2
    expect(connected.has("n3")).toBe(true); // n2 → n3
  });

  // Mutation: does not include nodes two hops away
  it("does not include nodes beyond direct neighbours", () => {
    const connected = getConnectedNodeIds(nodes, edges, "n1");
    expect(connected.has("n3")).toBe(false);
  });
});
