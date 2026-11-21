import { describe, expect, it } from "vitest";
import { downloadOfflineDeck, type OfflineDeckStore } from "./offline-deck-library";
import type { BaralhoDetail } from "../domain/baralho.types";

class FakeOfflineDeckStore implements OfflineDeckStore {
  readonly saved = new Map<string, BaralhoDetail>();

  async save(scope: string, deck: BaralhoDetail): Promise<void> {
    this.saved.set(scope, deck);
  }

  async list(scope: string): Promise<BaralhoDetail[]> {
    const deck = this.saved.get(scope);
    return deck ? [deck] : [];
  }
}

const deck: BaralhoDetail = {
  id: "deck-1", titulo: "Biology", dataCriacao: new Date(0), origens: [],
  cards: [{
    id: "card-1", pergunta: "Question", resposta: "Answer", conceito: "",
    tipo: null, conceitosConectados: [], schedule: null,
  }],
};

describe("downloadOfflineDeck", () => {
  it("persists the complete snapshot in the verified account scope", async () => {
    const store = new FakeOfflineDeckStore();
    await downloadOfflineDeck(store, async () => deck, () => "account-1");
    expect(await store.list("account-1")).toEqual([deck]);
    expect(await store.list("account-2")).toEqual([]);
  });

  it("discards an in-flight download after the active account changes", async () => {
    const store = new FakeOfflineDeckStore();
    let scope = "account-1";
    await expect(downloadOfflineDeck(store, async () => {
      scope = "account-2";
      return deck;
    }, () => scope)).rejects.toThrow(/account-2/);
    expect(store.saved.size).toBe(0);
  });

  it("rejects legacy snapshots without explicit review state", async () => {
    const store = new FakeOfflineDeckStore();
    const legacy = { ...deck, cards: [{ ...deck.cards[0], schedule: undefined }] };
    await expect(downloadOfflineDeck(store, async () => legacy, () => "account-1"))
      .rejects.toThrow(/card-1/);
    expect(store.saved.size).toBe(0);
  });
});
