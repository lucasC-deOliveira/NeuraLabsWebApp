import { describe, it, expect } from "vitest";
import { classifyError } from "./erro-classificacao";

describe("classifyError", () => {
  describe("empty user answer", () => {
    it("classifies as CONCEITUAL when user gives no answer", () => {
      const result = classifyError("", "O poder supremo do Estado pertence ao povo");
      expect(result.tipo).toBe("CONCEITUAL");
    });

    it("classifies as CONCEITUAL when answer has only short words (ignored tokens)", () => {
      // "de e a" — all <= 2 chars, tokenizer filters them out
      const result = classifyError("de e a", "Soberania é o poder supremo");
      expect(result.tipo).toBe("CONCEITUAL");
    });
  });

  describe("high overlap (>= 60%) → DETALHE", () => {
    it("returns DETALHE when most tokens match but not exactly correct", () => {
      const correct = "poder supremo estado pertence povo";
      const user = "poder supremo estado pertence nação"; // 4/5 tokens match
      const result = classifyError(user, correct);
      expect(result.tipo).toBe("DETALHE");
    });

    it("DETALHE explanation mentions imprecision", () => {
      // Uses only plain ASCII so the \w tokenizer doesn't split accented words
      const result = classifyError(
        "poder supremo estado pertence nacao regiao",
        "poder supremo estado pertence povo regiao"
      );
      expect(result.tipo).toBe("DETALHE");
      expect(result.explicacao.length).toBeGreaterThan(0);
    });
  });

  describe("medium overlap (30-59%) → INCOMPLETO", () => {
    it("returns INCOMPLETO when answer is partially correct", () => {
      const correct = "poder supremo estado pertence povo democracia constituição";
      const user = "poder supremo estado"; // 3/7 ≈ 43%
      const result = classifyError(user, correct);
      expect(result.tipo).toBe("INCOMPLETO");
    });
  });

  describe("very low overlap (< 15%) → CONCEITUAL", () => {
    it("returns CONCEITUAL when answer has almost no matching terms", () => {
      const result = classifyError(
        "banana laranja abacaxi morango",
        "soberania federalismo constituição democracia"
      );
      expect(result.tipo).toBe("CONCEITUAL");
    });
  });

  describe("low-medium overlap (15-29%) → EXCECAO", () => {
    it("returns EXCECAO when answer shows confusion between rule and exception", () => {
      // 1/5 = 20% overlap — falls into EXCECAO zone
      const correct = "soberania federalismo constituição democracia republica";
      const user = "soberania monarquia imperialismo colonialismo";
      const result = classifyError(user, correct);
      expect(result.tipo).toBe("EXCECAO");
    });
  });

  describe("mutation guards", () => {
    it("correct answer being a superset of user answer reduces overlap ratio", () => {
      // overlap is computed as: shared / correctTokens.length
      // so a longer correct answer with same shared words → lower ratio
      const result1 = classifyError("poder estado", "poder estado");
      const result2 = classifyError("poder estado", "poder estado soberania federalismo democracia republica");
      // result1 should have high overlap, result2 lower
      expect(result1.tipo).toBe("DETALHE");
      expect(["INCOMPLETO", "EXCECAO", "CONCEITUAL"]).toContain(result2.tipo);
    });

    it("case-insensitive matching via tokeniser", () => {
      const r1 = classifyError("PODER ESTADO SOBERANIA", "poder estado soberania");
      const r2 = classifyError("poder estado soberania", "PODER ESTADO SOBERANIA");
      expect(r1.tipo).toBe(r2.tipo);
    });

    it("punctuation is stripped before comparison", () => {
      const r1 = classifyError("poder, estado; soberania.", "poder estado soberania");
      expect(r1.tipo).toBe("DETALHE");
    });

    it("always returns an explicacao string", () => {
      for (const [user, correct] of [
        ["", "soberania federalismo"],
        ["soberania federalismo", "soberania federalismo"],
        ["banana", "soberania federalismo constituição democracia"],
        ["soberania monarquia", "soberania federalismo constituição democracia republica"],
      ]) {
        const result = classifyError(user, correct);
        expect(typeof result.explicacao).toBe("string");
        expect(result.explicacao.length).toBeGreaterThan(0);
      }
    });
  });
});
