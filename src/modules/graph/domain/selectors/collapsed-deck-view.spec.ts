import { expect, it } from "vitest";
import { graphDeckIds, projectCollapsedDecks } from "./collapsed-deck-view";

const nodes = [
  { id: "deck", group: "BARALHO", x: 10, y: 20 },
  { id: "second-deck", group: "BARALHO", x: 15, y: 25 },
  { id: "card-a", group: "FLASHCARD", x: 30, y: 40 },
  { id: "card-b", group: "FLASHCARD", x: 50, y: 60 },
  { id: "concept", group: "CONCEITO", x: 70, y: 80 },
  { id: "note", group: "NOTA", x: 90, y: 100 },
];

function deckEdge(source: string, type: string, target: string): {
  source: string; type: string; target: string; sourceX: number; sourceY: number; targetX: number; targetY: number;
} {
  return { source, type, target, sourceX: 0, sourceY: 0, targetX: 0, targetY: 0 };
}

it("projects and deduplicates concept links while preserving the original graph for expansion", () => {
  const edges = [
    deckEdge("deck", "CONTEM", "card-a"), deckEdge("deck", "CONTEM", "card-b"),
    deckEdge("card-a", "HERDA", "concept"), deckEdge("card-b", "HERDA", "concept"),
    deckEdge("concept", "EXPLICA", "card-b"), deckEdge("card-a", "TESTA", "note"),
  ];
  const collapsed = projectCollapsedDecks(nodes, edges, edges, new Set(["deck"]));
  expect(collapsed.nodes.map(({ id }) => id)).toEqual(["deck", "second-deck", "concept", "note"]);
  expect(collapsed.edges).toEqual([
    { ...deckEdge("deck", "HERDA", "concept"), sourceX: 10, sourceY: 20 },
    { ...deckEdge("concept", "EXPLICA", "deck"), targetX: 10, targetY: 20 },
  ]);
  expect(projectCollapsedDecks(nodes, edges, edges, new Set()).edges).toBe(edges);
});

it("keeps a shared card visible while another containing deck is expanded", () => {
  const edges = [
    deckEdge("deck", "CONTEM", "card-a"), deckEdge("second-deck", "CONTEM", "card-a"),
    deckEdge("card-a", "HERDA", "concept"),
  ];
  const collapsed = projectCollapsedDecks(nodes, edges, edges, new Set(["deck"]));
  expect(collapsed.nodes).toContainEqual(nodes[2]);
  expect(collapsed.edges.map(({ source, target }) => [source, target]))
    .toEqual([["second-deck", "card-a"], ["card-a", "concept"], ["deck", "concept"]]);
});

it("identifies only decks that contain a flashcard in the graph", () => {
  const rawNodes = nodes.map(({ id, group }) => ({ id, type: group }));
  const edges = [deckEdge("deck", "CONTEM", "card-a"), deckEdge("second-deck", "CONTEM", "note")];
  expect(graphDeckIds(rawNodes, edges)).toEqual(new Set(["deck"]));
});
