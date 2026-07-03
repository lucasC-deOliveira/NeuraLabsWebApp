import { describe, it, expect } from "vitest";
import { validateNodeEditFields } from "./node-edit-validation";

describe("validateNodeEditFields", () => {
  it("requires nome for structural nodes (CONCEITO/TOPICO/ASSUNTO)", () => {
    expect(validateNodeEditFields("CONCEITO", { nome: "" })).toBe("missing-name");
    expect(validateNodeEditFields("CONCEITO", { nome: "  " })).toBe("missing-name");
    expect(validateNodeEditFields("CONCEITO", { nome: "Mitose" })).toBeNull();
  });

  it("requires both pergunta and resposta for FLASHCARD", () => {
    expect(validateNodeEditFields("FLASHCARD", { pergunta: "q", resposta: "" })).toBe(
      "flashcard-missing-fields",
    );
    expect(validateNodeEditFields("FLASHCARD", { pergunta: "", resposta: "a" })).toBe(
      "flashcard-missing-fields",
    );
    expect(validateNodeEditFields("FLASHCARD", { pergunta: "q", resposta: "a" })).toBeNull();
  });

  it("validates NOTA fields in order: title, subtype, source (literatura), content", () => {
    expect(validateNodeEditFields("NOTA", { titulo: "" })).toBe("nota-missing-title");
    expect(validateNodeEditFields("NOTA", { titulo: "t" })).toBe("nota-missing-subtype");
    expect(
      validateNodeEditFields("NOTA", { titulo: "t", subtipo: "DEFINICAO", tipoNota: "LITERATURA", fonte: "" }),
    ).toBe("nota-missing-source");
    expect(
      validateNodeEditFields("NOTA", { titulo: "t", subtipo: "DEFINICAO", conteudo: "" }),
    ).toBe("nota-missing-content");
    expect(
      validateNodeEditFields("NOTA", { titulo: "t", subtipo: "DEFINICAO", conteudo: "x" }),
    ).toBeNull();
  });

  it("does not require source when the nota is not LITERATURA", () => {
    expect(
      validateNodeEditFields("NOTA", { titulo: "t", subtipo: "DEFINICAO", tipoNota: "PERMANENTE", conteudo: "x" }),
    ).toBeNull();
  });
});
