import { describe, it, expect } from "vitest";
import {
  expandSubgraphIntoView,
  retractSubgraphFromView,
  isSubgraphExpanded,
  type GraphView,
} from "./subgraph-expansion";
import type { GraphNodeType, GraphEdgeType } from "../types/graph.types";

const node = (id: string, type = "CONCEITO", over: Partial<GraphNodeType> = {}): GraphNodeType => ({
  id,
  label: id,
  type,
  nivelDominio: 0,
  prioridadeRevisao: 5,
  ...over,
});

const edge = (source: string, target: string, type = "RELACIONADO"): GraphEdgeType => ({
  source,
  target,
  type,
  peso: 1,
});

const tile = node("sub-1", "GRAFO_REF", { posicaoX: 100, posicaoY: 200 });
const view: GraphView = { nodes: [tile, node("a")], edges: [] };

describe("expandSubgraphIntoView", () => {
  const child: GraphView = {
    nodes: [node("raiz", "ASSUNTO"), node("x"), node("y")],
    edges: [edge("x", "y")],
  };

  it("pulls the subgraph nodes in, tagged with the tile", () => {
    const out = expandSubgraphIntoView(view, tile, child);
    const trazidos = out.nodes.filter((n) => n.expandedFrom === "sub-1").map((n) => n.id);
    expect(trazidos.sort()).toEqual(["raiz", "x", "y"]);
  });

  it("spreads the injected nodes around the tile, not stacked on it", () => {
    const out = expandSubgraphIntoView(view, tile, child);
    const injetados = out.nodes.filter((n) => n.expandedFrom === "sub-1");
    // nenhum cai exatamente sobre a tile (100, 200)
    expect(injetados.every((n) => n.posicaoX !== 100 || n.posicaoY !== 200)).toBe(true);
  });

  it("brings the subgraph's own edges", () => {
    const out = expandSubgraphIntoView(view, tile, child);
    expect(out.edges.some((e) => e.source === "x" && e.target === "y")).toBe(true);
  });

  it("anchors the cluster: an edge from the tile to each ASSUNTO root", () => {
    const out = expandSubgraphIntoView(view, tile, child);
    expect(out.edges.some((e) => e.source === "sub-1" && e.target === "raiz")).toBe(true);
  });

  // O mesmo nó do sistema pode estar nos dois grafos: não pode aparecer duas vezes.
  it("does not duplicate a node already in the view", () => {
    const comCompartilhado: GraphView = { nodes: [node("raiz", "ASSUNTO"), node("a")], edges: [] };
    const out = expandSubgraphIntoView(view, tile, comCompartilhado);
    expect(out.nodes.filter((n) => n.id === "a")).toHaveLength(1);
    // e o compartilhado não é marcado (não foi injetado), então o retrair não o leva
    expect(out.nodes.find((n) => n.id === "a")?.expandedFrom).toBeUndefined();
  });

  it("never re-injects the tile itself", () => {
    const child2: GraphView = { nodes: [node("sub-1", "GRAFO_REF"), node("z")], edges: [] };
    const out = expandSubgraphIntoView(view, tile, child2);
    expect(out.nodes.filter((n) => n.id === "sub-1")).toHaveLength(1);
  });

  // A expansão inline é a ESTRUTURA, não o acervo: um subgrafo de milhares de
  // flashcards congelaria o render e afogaria o mapa. Eles ficam a um clique.
  it("leaves out flashcards and questions, keeping the structure", () => {
    const pesado: GraphView = {
      nodes: [node("assunto", "ASSUNTO"), node("conceito", "CONCEITO"), node("fc", "FLASHCARD"), node("q", "QUESTION")],
      edges: [],
    };
    const out = expandSubgraphIntoView(view, tile, pesado);
    const trazidos = out.nodes.filter((n) => n.expandedFrom === "sub-1").map((n) => n.id);
    expect(trazidos.sort()).toEqual(["assunto", "conceito"]);
  });

  it("does not duplicate an edge the view already has", () => {
    const comAresta: GraphView = { nodes: [tile, node("a")], edges: [edge("x", "y")] };
    const out = expandSubgraphIntoView(comAresta, tile, child);
    expect(out.edges.filter((e) => e.source === "x" && e.target === "y")).toHaveLength(1);
  });
});

describe("retractSubgraphFromView", () => {
  it("removes exactly what the tile brought, keeping the tile and the view's own nodes", () => {
    const expanded = expandSubgraphIntoView(view, tile, {
      nodes: [node("raiz", "ASSUNTO"), node("x")],
      edges: [],
    });
    const out = retractSubgraphFromView(expanded, "sub-1");

    expect(out.nodes.map((n) => n.id).sort()).toEqual(["a", "sub-1"]);
    expect(out.edges).toHaveLength(0);
  });

  // Duas tiles expandidas: retrair uma não pode levar os nós da outra.
  it("only removes the given tile's nodes when several are expanded", () => {
    const tile2 = node("sub-2", "GRAFO_REF", { posicaoX: 500, posicaoY: 500 });
    let v = expandSubgraphIntoView({ nodes: [tile, tile2], edges: [] }, tile, {
      nodes: [node("x1")],
      edges: [],
    });
    v = expandSubgraphIntoView(v, tile2, { nodes: [node("x2")], edges: [] });

    const out = retractSubgraphFromView(v, "sub-1");
    expect(out.nodes.map((n) => n.id).sort()).toEqual(["sub-1", "sub-2", "x2"]);
  });
});

describe("isSubgraphExpanded", () => {
  it("is true once a tile has pulled nodes in", () => {
    const out = expandSubgraphIntoView(view, tile, { nodes: [node("x")], edges: [] });
    expect(isSubgraphExpanded(out.nodes, "sub-1")).toBe(true);
    expect(isSubgraphExpanded(out.nodes, "sub-2")).toBe(false);
  });

  it("is false on a fresh view", () => {
    expect(isSubgraphExpanded(view.nodes, "sub-1")).toBe(false);
  });
});
