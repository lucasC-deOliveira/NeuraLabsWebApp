import { describe, it, expect } from "vitest";
import { groupRelations, connectedType } from "./group-relations";
import type { PropertiesEdge } from "./properties-panel.types";

const edge = (over: Partial<PropertiesEdge>): PropertiesEdge => ({
  id: "e",
  source: "me",
  target: "x",
  tipoRelacao: "RELACIONADO",
  peso: 1,
  sourceLabel: "Me",
  targetLabel: "X",
  ...over,
});

describe("connectedType", () => {
  it("returns the target type for an outgoing edge", () => {
    expect(connectedType(edge({ target: "x", targetType: "CONCEITO" }), "me")).toBe("CONCEITO");
  });

  it("returns the source type for an incoming edge", () => {
    const e = edge({ source: "x", target: "me", sourceType: "NOTA" });
    expect(connectedType(e, "me")).toBe("NOTA");
  });

  it('falls back to "" when the endpoint type is missing', () => {
    expect(connectedType(edge({ targetType: undefined }), "me")).toBe("");
  });
});

describe("groupRelations", () => {
  it("groups by connected type, then by relation", () => {
    const edges = [
      edge({ id: "1", targetType: "CONCEITO", tipoRelacao: "PREREQUISITO" }),
      edge({ id: "2", targetType: "CONCEITO", tipoRelacao: "PREREQUISITO" }),
      edge({ id: "3", targetType: "CONCEITO", tipoRelacao: "RELACIONADO" }),
      edge({ id: "4", targetType: "NOTA", tipoRelacao: "DEFINE" }),
    ];
    const groups = groupRelations(edges, "me");

    expect(groups.map((g) => g.tipo)).toEqual(["CONCEITO", "NOTA"]);
    const conceito = groups[0];
    expect(conceito.relacoes.map((r) => r.relacao)).toEqual(["PREREQUISITO", "RELACIONADO"]);
    expect(conceito.relacoes[0].edges.map((e) => e.id)).toEqual(["1", "2"]);
    expect(groups[1].relacoes[0].edges.map((e) => e.id)).toEqual(["4"]);
  });

  it("orders types by the canonical hierarchy, unknowns last", () => {
    const edges = [
      edge({ id: "a", targetType: "FLASHCARD" }),
      edge({ id: "b", targetType: "ASSUNTO" }),
      edge({ id: "c", targetType: undefined }),
    ];
    expect(groupRelations(edges, "me").map((g) => g.tipo)).toEqual(["ASSUNTO", "FLASHCARD", ""]);
  });

  it("returns an empty array for no edges", () => {
    expect(groupRelations([], "me")).toEqual([]);
  });
});
