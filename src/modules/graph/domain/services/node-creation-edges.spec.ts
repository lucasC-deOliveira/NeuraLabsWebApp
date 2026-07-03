import { describe, it, expect } from "vitest";
import { clampEdgePeso, buildCreatedNodeEdges, type CreatedNodeEdgesInput } from "./node-creation-edges";

function input(overrides: Partial<CreatedNodeEdgesInput>): CreatedNodeEdgesInput {
  return {
    type: "ASSUNTO",
    newNodeId: "new1",
    topicoAssuntos: [],
    conceitoTopicos: [],
    flashcardConceitos: [],
    notaConceitos: [],
    acceptedSuggestions: [],
    notaTextoBrutoId: "",
    ...overrides,
  };
}

describe("clampEdgePeso", () => {
  it("clamps to (0, 2] and falls back to 1 for invalid values", () => {
    expect(clampEdgePeso(1.5)).toBe(1.5);
    expect(clampEdgePeso(3)).toBe(2);
    expect(clampEdgePeso(0)).toBe(1);
    expect(clampEdgePeso(-1)).toBe(1);
    expect(clampEdgePeso(NaN)).toBe(1);
  });
});

describe("buildCreatedNodeEdges", () => {
  it("returns no edges for ASSUNTO", () => {
    expect(buildCreatedNodeEdges(input({ type: "ASSUNTO" }))).toEqual([]);
  });

  it("maps TOPICO→assunto links, skipping empty ids and clamping weight", () => {
    const edges = buildCreatedNodeEdges(
      input({
        type: "TOPICO",
        topicoAssuntos: [
          { assuntoId: "a1", relacao: "PERTENCE_A", peso: 5 },
          { assuntoId: "", relacao: "PERTENCE_A", peso: 1 },
        ],
      }),
    );
    expect(edges).toEqual([{ targetNodeId: "a1", tipoRelacao: "PERTENCE_A", peso: 2 }]);
  });

  it("maps CONCEITO→topico and FLASHCARD→conceito links", () => {
    expect(buildCreatedNodeEdges(input({ type: "CONCEITO", conceitoTopicos: [{ topicoId: "t1", relacao: "PERTENCE_A", peso: 1 }] }))).toEqual([
      { targetNodeId: "t1", tipoRelacao: "PERTENCE_A", peso: 1 },
    ]);
    expect(buildCreatedNodeEdges(input({ type: "FLASHCARD", flashcardConceitos: [{ conceitoId: "c1", relacao: "DEFINE", peso: 1 }] }))).toEqual([
      { targetNodeId: "c1", tipoRelacao: "DEFINE", peso: 1 },
    ]);
  });

  it("for NOTA, includes concept links, accepted AI suggestions, and the source TEXTO_BRUTO (GERA)", () => {
    const edges = buildCreatedNodeEdges(
      input({
        type: "NOTA",
        newNodeId: "nota1",
        notaConceitos: [{ conceitoId: "c1", relacao: "DEFINE", peso: 1 }],
        acceptedSuggestions: [{ nodeId: "c2", relacao: "EXPLICA" }],
        notaTextoBrutoId: "txt1",
      }),
    );
    expect(edges).toEqual([
      { targetNodeId: "c1", tipoRelacao: "DEFINE", peso: 1 },
      { targetNodeId: "c2", tipoRelacao: "EXPLICA", peso: 1.0 },
      { sourceNodeId: "txt1", targetNodeId: "nota1", tipoRelacao: "GERA", peso: 1.0 },
    ]);
  });

  it("for NOTA without a source text, omits the GERA edge", () => {
    const edges = buildCreatedNodeEdges(input({ type: "NOTA", notaConceitos: [{ conceitoId: "c1", relacao: "DEFINE", peso: 1 }] }));
    expect(edges).toEqual([{ targetNodeId: "c1", tipoRelacao: "DEFINE", peso: 1 }]);
  });
});
