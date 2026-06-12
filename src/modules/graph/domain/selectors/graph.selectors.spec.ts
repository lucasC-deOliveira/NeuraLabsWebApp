import { describe, it, expect } from "vitest";
import {
  getFilteredNodes,
  getVisibleNodeIds,
  getFilteredEdges,
  getNodeStats,
  getConnectedNodeIds,
  getNodesInRect,
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
  it("returns all nodes when no type is hidden", () => {
    expect(getFilteredNodes(nodes, new Set())).toHaveLength(4);
  });

  it("hides nodes of the deactivated type", () => {
    const result = getFilteredNodes(nodes, new Set(["CONCEITO"]));
    expect(result).toHaveLength(2);
    expect(result.every((n) => n.group !== "CONCEITO")).toBe(true);
  });

  it("can hide multiple types at once", () => {
    const result = getFilteredNodes(nodes, new Set(["CONCEITO", "TOPICO"]));
    expect(result).toHaveLength(1);
    expect(result[0].group).toBe("ASSUNTO");
  });

  // Mutation: ensure visibility check is exact match, not partial
  it("does not hide on partial type names", () => {
    expect(getFilteredNodes(nodes, new Set(["ASSUN"]))).toHaveLength(4);
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

describe("getNodesInRect (seleção múltipla por retângulo)", () => {
  it("seleciona nós cujo centro está dentro do retângulo", () => {
    const ids = getNodesInRect(nodes, { x1: 5, y1: 5, x2: 25, y2: 25 });
    expect(ids).toEqual(["n2", "n3"]);
  });

  it("retângulo desenhado de baixo para cima / direita para esquerda funciona igual", () => {
    const normal = getNodesInRect(nodes, { x1: 5, y1: 5, x2: 25, y2: 25 });
    const invertido = getNodesInRect(nodes, { x1: 25, y1: 25, x2: 5, y2: 5 });
    expect(invertido).toEqual(normal);
  });

  it("retângulo de área zero não seleciona ninguém (clique simples limpa seleção)", () => {
    expect(getNodesInRect(nodes, { x1: 5, y1: 5, x2: 5, y2: 5 })).toEqual([]);
  });

  it("nó exatamente na borda do retângulo é incluído", () => {
    const ids = getNodesInRect(nodes, { x1: 0, y1: 0, x2: 10, y2: 10 });
    expect(ids).toEqual(["n1", "n2"]);
  });

  it("retângulo cobrindo tudo seleciona todos", () => {
    const ids = getNodesInRect(nodes, { x1: -100, y1: -100, x2: 100, y2: 100 });
    expect(ids).toHaveLength(4);
  });

  // Mutação: os dois eixos precisam ser checados — retângulo fino em x não
  // pode selecionar por y e vice-versa
  it("nó dentro do intervalo de x mas fora do de y não é selecionado", () => {
    const ids = getNodesInRect(nodes, { x1: -100, y1: 8, x2: 100, y2: 12 });
    expect(ids).toEqual(["n2"]);
  });

  it("nó dentro do intervalo de y mas fora do de x não é selecionado", () => {
    const ids = getNodesInRect(nodes, { x1: 8, y1: -100, x2: 12, y2: 100 });
    expect(ids).toEqual(["n2"]);
  });
});
