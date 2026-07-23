import { describe, it, expect } from "vitest";
import { buildMiniGraph } from "./build-mini-graph";
import type { ConceptConnection } from "./mini-graph.types";

const conn = (conceito: string, topico: string, assunto: string): ConceptConnection => ({
  conceito,
  topico,
  assunto,
});

describe("buildMiniGraph", () => {
  it("creates one root plus deduped concept/topic/subject nodes", () => {
    const connections = [
      conn("Heap", "Árvores", "Estruturas"),
      conn("Heap", "Árvores", "Estruturas"), // duplicata
      conn("Pilha", "Listas", "Estruturas"),
    ];
    const model = buildMiniGraph("O que é heap?", connections);

    const byLayer = (l: number): string[] => model.nodes.filter((n) => n.layer === l).map((n) => n.label);
    expect(byLayer(0)).toEqual(["O que é heap?"]);
    expect(byLayer(1)).toEqual(["Heap", "Pilha"]);
    expect(byLayer(2)).toEqual(["Árvores", "Listas"]);
    expect(byLayer(3)).toEqual(["Estruturas"]); // assunto único
  });

  it("links item→concept→topic→subject without duplicate edges", () => {
    const model = buildMiniGraph("Item", [conn("A", "T", "S"), conn("A", "T", "S")]);
    expect(model.edges).toEqual([
      { from: "root", to: "1:A" },
      { from: "1:A", to: "2:T" },
      { from: "2:T", to: "3:S" },
    ]);
  });

  it("returns just the root when there are no connections", () => {
    const model = buildMiniGraph("Sozinho", []);
    expect(model.nodes).toHaveLength(1);
    expect(model.edges).toEqual([]);
  });
});
