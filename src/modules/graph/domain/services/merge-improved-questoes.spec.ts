import { describe, it, expect } from "vitest";
import { mergeImprovedQuestoes, toImproveBatchInput } from "./merge-improved-questoes";

const parsed = [
  {
    numero: 1,
    tipo: "MULTIPLA_ESCOLHA",
    enunciado: "q1",
    alternativas: [
      { letra: "A", texto: "a1" },
      { letra: "B", texto: "b1" },
    ],
    gabarito: "B",
    explicacao: null,
    imagens: [{ id: "img1" }],
  },
  { numero: 2, tipo: "VERDADEIRO_FALSO", enunciado: "q2", alternativas: null, gabarito: "V", explicacao: "e2" },
];

describe("mergeImprovedQuestoes", () => {
  it("replaces text but preserves gabarito, tipo, imagens and untouched questions", () => {
    const out = mergeImprovedQuestoes(parsed, [
      { numero: 1, enunciado: "**q1**", alternativas: [{ letra: "A", texto: "A1" }], explicacao: "novo" },
      // questão 2 ausente → mantida
    ]);
    expect(out[0]).toEqual({
      numero: 1,
      tipo: "MULTIPLA_ESCOLHA",
      enunciado: "**q1**",
      alternativas: [
        { letra: "A", texto: "A1" }, // trocado
        { letra: "B", texto: "b1" }, // mantido (não veio no improved)
      ],
      gabarito: "B", // preservado
      explicacao: "novo",
      imagens: [{ id: "img1" }], // preservado
    });
    expect(out[1]).toBe(parsed[1]); // questão 2 intocada (mesma referência)
  });
});

describe("toImproveBatchInput", () => {
  it("maps parsed questions to the batch input shape", () => {
    expect(toImproveBatchInput(parsed)[1]).toEqual({
      numero: 2,
      tipo: "VERDADEIRO_FALSO",
      enunciado: "q2",
      alternativas: [],
      gabarito: "V",
      explicacao: "e2",
    });
  });
});
