import { describe, it, expect } from "vitest";
import { buildManualCard, EMPTY_MANUAL_FIELDS, type ManualCardFields } from "./manual-card";

function fields(over: Partial<ManualCardFields>): ManualCardFields {
  return { ...EMPTY_MANUAL_FIELDS, ...over };
}

describe("buildManualCard", () => {
  it("wraps a DEFINICAO prompt", () => {
    expect(buildManualCard("DEFINICAO", fields({ pergunta: "Soberania", resposta: "poder supremo" })))
      .toEqual({ pergunta: "O que é Soberania?", resposta: "poder supremo" });
  });

  it("numbers ORDENACAO items", () => {
    expect(buildManualCard("ORDENACAO", fields({ temaLista: "passos", itens: ["a", "", "b"] })))
      .toEqual({ pergunta: "Coloque em ordem: passos", resposta: "1. a\n2. b" });
  });

  it("formats ERRO_COMUM answer", () => {
    expect(buildManualCard("ERRO_COMUM", fields({ temaErro: "X", erro: "e1", correto: "c1" })))
      .toEqual({ pergunta: 'Qual o erro comum sobre "X"?', resposta: "ERRO: e1\n\nCORRETO: c1" });
  });

  it("contrasts two concepts", () => {
    expect(buildManualCard("CONTRASTE", fields({ conceitoA: "A", conceitoB: "B", explicacaoComp: "diff" })).pergunta)
      .toBe("Qual a diferença entre A e B?");
  });
});

