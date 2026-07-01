import { describe, it, expect } from "vitest";
import { availableTargets, availableSources, type CandidateNode } from "./edge-candidates";

const nodes: CandidateNode[] = [
  { id: "n1", label: "A", type: "CONCEITO" },
  { id: "n2", label: "B", type: "CONCEITO" },
  { id: "n3", label: "C", type: "CONCEITO" },
];
const edges = [{ id: "e1", source: "n1", target: "n2" }];

describe("availableTargets", () => {
  it("excludes the source itself and already-linked targets", () => {
    const result = availableTargets(nodes, edges, "n1", "CONCEITO").map((n) => n.id);
    expect(result).toEqual(["n3"]);
  });

  it("keeps a target freed by excludeEdgeId (editing the same edge)", () => {
    const result = availableTargets(nodes, edges, "n1", "CONCEITO", "e1").map((n) => n.id);
    expect(result).toContain("n2");
  });

  it("drops targets whose type cannot relate to the source type", () => {
    // CONCEITO ↔ BARALHO is not in RELATION_PAIRS, so it cannot be a target.
    const mixed: CandidateNode[] = [
      { id: "n1", label: "A", type: "CONCEITO" },
      { id: "x", label: "X", type: "BARALHO" },
    ];
    const result = availableTargets(mixed, [], "n1", "CONCEITO").map((n) => n.id);
    expect(result).not.toContain("x");
  });
});

describe("availableSources", () => {
  it("excludes the target itself and already-linked sources", () => {
    const result = availableSources(nodes, edges, "n2").map((n) => n.id);
    expect(result).toEqual(["n3"]);
  });
});
