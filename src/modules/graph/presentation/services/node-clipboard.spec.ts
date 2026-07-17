import { describe, it, expect } from "vitest";
import { toClipItems, parseClipboard, type NodeClipboard } from "./node-clipboard";

describe("toClipItems", () => {
  const nodes = [
    { id: "a", tipoReal: "CONCEITO", label: "Recursão" },
    { id: "b", tipoReal: "FLASHCARD", label: "O que é?" },
    { id: "c", group: "BARALHO", label: "Deck" },
  ];

  it("keeps only the selected nodes, in list order", () => {
    const items = toClipItems(nodes, new Set(["c", "a"]));
    expect(items.map((i) => i.entityId)).toEqual(["a", "c"]);
  });

  it("maps tipoReal, falling back to group", () => {
    const items = toClipItems(nodes, new Set(["a", "c"]));
    expect(items[0].tipoNode).toBe("CONCEITO");
    expect(items[1].tipoNode).toBe("BARALHO");
  });

  it("returns empty when nothing is selected", () => {
    expect(toClipItems(nodes, new Set())).toEqual([]);
  });
});

describe("parseClipboard", () => {
  const valid: NodeClipboard = {
    items: [{ entityId: "a", tipoNode: "CONCEITO", label: "X" }],
    mode: "copy",
    sourceGrafoId: "g1",
  };

  it("parses a well-formed payload", () => {
    expect(parseClipboard(JSON.stringify(valid))).toEqual(valid);
  });

  it("returns null for absent, empty, or malformed input", () => {
    expect(parseClipboard(null)).toBeNull();
    expect(parseClipboard("not json")).toBeNull();
    expect(parseClipboard(JSON.stringify({ items: [], mode: "copy", sourceGrafoId: "g" }))).toBeNull();
  });

  it("rejects an unknown mode", () => {
    const bad = { ...valid, mode: "teleport" };
    expect(parseClipboard(JSON.stringify(bad))).toBeNull();
  });
});
