import { describe, it, expect } from "vitest";
import { autoReadTarget } from "./useAutoRead";

const card = { id: "c1", pergunta: "O que é mitose?", resposta: "Divisão celular" };

describe("autoReadTarget", () => {
  it("reads the question in the question phase", () => {
    expect(autoReadTarget("question", card)).toEqual({ id: "pergunta", text: "O que é mitose?" });
  });

  it("reads the answer in the answer phase", () => {
    expect(autoReadTarget("answer", card)).toEqual({ id: "resposta", text: "Divisão celular" });
  });

  it("excludes bibliography from automatic playback on either side", () => {
    const cited = {
      ...card,
      pergunta: card.pergunta + "\n\n> **Fonte:** Study guide",
      resposta: card.resposta + "\n\n## Referências\n\n- Study guide",
    };
    expect(autoReadTarget("question", cited)?.text).toBe(card.pergunta);
    expect(autoReadTarget("answer", cited)?.text).toBe(card.resposta);
  });

  it("reads nothing in other phases (loading, finished, ...)", () => {
    expect(autoReadTarget("loading", card)).toBeNull();
    expect(autoReadTarget("waiting", card)).toBeNull();
  });
});
