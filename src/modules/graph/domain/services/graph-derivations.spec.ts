import { describe, it, expect } from "vitest";
import {
  splitGraphEntities,
  countNodesByType,
  neighborhoodFlashcardIds,
  type GraphNodeLike,
  type GraphEdgeLike,
} from "./graph-derivations";

const nodes: GraphNodeLike[] = [
  { id: "a1", label: "Assunto", group: "ASSUNTO" },
  { id: "t1", label: "Tópico", group: "TOPICO" },
  { id: "c1", label: "Conceito", group: "CONCEITO" },
  { id: "f1", label: "Card 1", group: "FLASHCARD" },
  { id: "f2", label: "Card 2", group: "FLASHCARD" },
  { id: "f3", label: "Card 3", group: "FLASHCARD" },
];

describe("splitGraphEntities", () => {
  it("buckets nodes by group into id/nome items", () => {
    const e = splitGraphEntities(nodes);
    expect(e.assuntos).toEqual([{ id: "a1", nome: "Assunto" }]);
    expect(e.conceitos).toEqual([{ id: "c1", nome: "Conceito" }]);
    expect(e.flashcards).toHaveLength(3);
    expect(e.textosBrutos).toEqual([]);
  });

  it("ignores unknown groups", () => {
    const e = splitGraphEntities([{ id: "b1", label: "Baralho", group: "BARALHO" }]);
    expect(e.assuntos).toEqual([]);
    expect(e.flashcards).toEqual([]);
  });
});

describe("countNodesByType", () => {
  it("counts nodes per group", () => {
    expect(countNodesByType(nodes)).toEqual({ ASSUNTO: 1, TOPICO: 1, CONCEITO: 1, FLASHCARD: 3 });
  });
});

describe("neighborhoodFlashcardIds", () => {
  const edges: GraphEdgeLike[] = [
    { source: "c1", target: "f1" }, // 1 hop from c1
    { source: "f1", target: "f2" }, // 2 hops from c1
    { source: "f2", target: "f3" }, // 3 hops from c1
  ];

  it("collects flashcards within depth (excludes the source group)", () => {
    expect(neighborhoodFlashcardIds("c1", 1, nodes, edges).sort()).toEqual(["f1"]);
  });

  it("expands with depth", () => {
    expect(neighborhoodFlashcardIds("c1", 2, nodes, edges).sort()).toEqual(["f1", "f2"]);
  });

  it("returns empty when the node is isolated", () => {
    expect(neighborhoodFlashcardIds("a1", 3, nodes, edges)).toEqual([]);
  });
});
