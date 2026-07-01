import { describe, it, expect } from "vitest";
import { validateCreateNodeForm, buildCreateNodePayload, type CreateNodeFormValues } from "./create-node-form";

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

describe("validateCreateNodeForm", () => {
  it("requires nome for ASSUNTO/TOPICO/CONCEITO", () => {
    expect(validateCreateNodeForm("ASSUNTO", form())).toBe("missing-name");
    expect(validateCreateNodeForm("TOPICO", form({ nome: "x" }))).toBeNull();
  });

  it("distinguishes missing question vs answer for FLASHCARD", () => {
    expect(validateCreateNodeForm("FLASHCARD", form())).toBe("flashcard-missing-question");
    expect(validateCreateNodeForm("FLASHCARD", form({ pergunta: "q" }))).toBe("flashcard-missing-answer");
    expect(validateCreateNodeForm("FLASHCARD", form({ pergunta: "q", resposta: "a" }))).toBeNull();
  });

  it("validates NOTA fields in order (title, subtype, source, content)", () => {
    expect(validateCreateNodeForm("NOTA", form())).toBe("missing-name");
    expect(validateCreateNodeForm("NOTA", form({ nome: "t" }))).toBe("nota-missing-subtype");
    expect(validateCreateNodeForm("NOTA", form({ nome: "t", subtipo: "DEFINICAO", tipoNota: "LITERATURA" }))).toBe(
      "nota-missing-source",
    );
    expect(validateCreateNodeForm("NOTA", form({ nome: "t", subtipo: "DEFINICAO" }))).toBe("nota-missing-content");
    expect(validateCreateNodeForm("NOTA", form({ nome: "t", subtipo: "DEFINICAO", conteudo: "c" }))).toBeNull();
  });
});

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
