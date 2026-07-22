import { describe, it, expect } from "vitest";
import { questionSpeechText } from "./questao-speech";

describe("questionSpeechText", () => {
  it("appends the alternatives for a multiple-choice question", () => {
    const alts = [
      { letra: "A", texto: "Mitose" },
      { letra: "B", texto: "Meiose" },
    ];
    expect(questionSpeechText("O que divide a célula?", "MULTIPLA_ESCOLHA", alts)).toBe(
      "O que divide a célula?. A: Mitose. B: Meiose",
    );
  });

  it("reads only the statement for true/false (no alternatives, no gabarito)", () => {
    expect(questionSpeechText("A água ferve a 100°C.", "VERDADEIRO_FALSO", null)).toBe(
      "A água ferve a 100°C.",
    );
  });

  it("falls back to the statement when multiple-choice has no alternatives", () => {
    expect(questionSpeechText("Enunciado", "MULTIPLA_ESCOLHA", null)).toBe("Enunciado");
    expect(questionSpeechText("Enunciado", "MULTIPLA_ESCOLHA", [])).toBe("Enunciado");
  });
});
