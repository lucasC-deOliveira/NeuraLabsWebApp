import { describe, it, expect } from "vitest";
import { deckFlashcardIds, countDeckSrs } from "./useDeckStats";
import type { VaultNode } from "@/lib/vault-format";

function node(id: string, tipo: string, relacoes: VaultNode["relacoes"] = []): VaultNode {
  return { id, tipo, relacoes } as VaultNode;
}

describe("deckFlashcardIds", () => {
  it("keeps only CONTEM targets that resolve to a FLASHCARD node", () => {
    const baralho = node("b1", "BARALHO", [
      { rel: "CONTEM", alvo: "f1", peso: 1 },
      { rel: "CONTEM", alvo: "n1", peso: 1 }, // resolves to a NOTA → dropped
      { rel: "PERTENCE_A", alvo: "f2", peso: 1 }, // not CONTEM → dropped
    ]);
    const map = new Map([
      ["f1", node("f1", "FLASHCARD")],
      ["n1", node("n1", "NOTA")],
      ["f2", node("f2", "FLASHCARD")],
    ]);
    expect(deckFlashcardIds(baralho, map)).toEqual(["f1"]);
  });
});

describe("countDeckSrs", () => {
  const past = new Date(Date.now() - 86_400_000).toISOString();
  const future = new Date(Date.now() + 86_400_000).toISOString();

  it("counts cards without schedule as new and past-due ones as review", () => {
    const schedule = { f1: { proximaRevisao: past }, f2: { proximaRevisao: future } };
    expect(countDeckSrs(["f1", "f2", "f3"], schedule)).toEqual({ novos: 1, paraRevisar: 1 });
  });

  it("returns zeros for an empty deck", () => {
    expect(countDeckSrs([], {})).toEqual({ novos: 0, paraRevisar: 0 });
  });
});
