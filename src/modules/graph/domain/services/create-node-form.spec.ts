import { describe, it, expect } from "vitest";
import { buildCreateNodePayload, type CreateNodeFormValues } from "./create-node-form";

function form(overrides: Partial<CreateNodeFormValues> = {}): CreateNodeFormValues {
  return {
    nome: "",
    descricao: "",
    pergunta: "",
    resposta: "",
    conteudo: "",
    tipoNota: "PERMANENTE",
    subtipo: "",
    fonte: "",
    ...overrides,
  };
}

describe("buildCreateNodePayload", () => {
  it("builds ASSUNTO payload with nome + nulled empty descricao", () => {
    expect(buildCreateNodePayload("ASSUNTO", form({ nome: " A " }))).toEqual({ nome: "A", descricao: null });
  });

  it("adds the null parent hints for TOPICO and CONCEITO", () => {
    expect(buildCreateNodePayload("TOPICO", form({ nome: "T" }))).toMatchObject({ assuntoId: null });
    expect(buildCreateNodePayload("CONCEITO", form({ nome: "C" }))).toMatchObject({ topicoId: null });
  });

  it("builds FLASHCARD and NOTA payloads (title from nome)", () => {
    expect(buildCreateNodePayload("FLASHCARD", form({ pergunta: " q ", resposta: " a " }))).toEqual({
      pergunta: "q",
      resposta: "a",
    });
    expect(
      buildCreateNodePayload("NOTA", form({ nome: "T", conteudo: "c", subtipo: "DEFINICAO", fonte: "" })),
    ).toEqual({ titulo: "T", conteudo: "c", tipoNota: "PERMANENTE", subtipo: "DEFINICAO", fonte: null });
  });
});
