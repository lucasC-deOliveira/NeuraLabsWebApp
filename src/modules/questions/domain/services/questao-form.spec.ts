import { describe, it, expect } from "vitest";
import { reindexAlternativas, validateQuestao } from "./questao-form";

describe("reindexAlternativas", () => {
  it("reatribui as letras na ordem", () => {
    const out = reindexAlternativas([
      { letra: "B", texto: "x" },
      { letra: "D", texto: "y" },
      { letra: "E", texto: "z" },
    ]);
    expect(out.map((a) => a.letra)).toEqual(["A", "B", "C"]);
    expect(out.map((a) => a.texto)).toEqual(["x", "y", "z"]);
  });
});

describe("validateQuestao", () => {
  const alts = [{ letra: "A", texto: "a" }, { letra: "B", texto: "b" }];

  it("exige enunciado", () => {
    expect(validateQuestao("VERDADEIRO_FALSO", "   ", [])).toBe("Informe o enunciado.");
  });

  it("exige todas as alternativas preenchidas em múltipla escolha", () => {
    expect(validateQuestao("MULTIPLA_ESCOLHA", "Q?", [{ letra: "A", texto: "" }])).toBe("Preencha todas as alternativas.");
  });

  it("aceita múltipla escolha válida", () => {
    expect(validateQuestao("MULTIPLA_ESCOLHA", "Q?", alts)).toBeNull();
  });

  it("V/F não exige alternativas", () => {
    expect(validateQuestao("VERDADEIRO_FALSO", "Afirmação", [])).toBeNull();
  });
});
