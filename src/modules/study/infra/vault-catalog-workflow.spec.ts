import { describe, expect, it } from "vitest";
import type { VaultStudyWrite } from "@/lib/vault-bridge";
import { HttpBaralhosAdapter } from "@/modules/baralhos/infra/http/baralhos-http.adapter";
import { vaultAwareBaralhos } from "@/modules/baralhos/infra/vault-baralhos";
import { HttpFlashcardsAdapter } from "@/modules/flashcards/infra/http/flashcards-http.adapter";
import { vaultAwareFlashcards } from "@/modules/flashcards/infra/vault-flashcards";
import { ElectronVaultStudyStore } from "./electron-vault-study";

class FakeVaultCatalogFiles {
  private snapshot: string | null = null;

  async readStudy(): Promise<string | null> {
    return this.snapshot;
  }

  async writeStudy(update: VaultStudyWrite): Promise<boolean> {
    if (this.snapshot !== update.expected) return false;
    this.snapshot = update.next;
    return true;
  }
}

class FakeServerDecks extends HttpBaralhosAdapter {
  online = true;
  readonly deck = {
    id: "server-deck", titulo: "Server deck", dataCriacao: new Date(0), origens: [],
    totalCards: 1, novos: 1, aprender: 0, revisar: 0,
  };

  override async listBaralhos() {
    if (!this.online) throw new Error("Server unavailable");
    return [this.deck];
  }

  override async getBaralho() {
    return { ...this.deck, cards: [] };
  }

  override async renameBaralho(_id: string, title: string): Promise<void> {
    this.deck.titulo = title;
  }
}

class FakeServerFlashcards extends HttpFlashcardsAdapter {
  online = true;
  readonly card: Awaited<ReturnType<HttpFlashcardsAdapter["getFlashcards"]>>[number] = {
    id: "server-card", pergunta: "Server question", resposta: "Server answer", tipo: null,
    conceito: "", topico: "", topicoId: "", assunto: "", assuntoId: "", conceitosConectados: [],
    dataCriacao: new Date(0), spacedRepetition: null,
  };

  override async getFlashcards() {
    if (!this.online) throw new Error("Server unavailable");
    return [this.card];
  }

  override async updateFlashcard(_id: string, update: { pergunta?: string }): Promise<void> {
    if (update.pergunta) this.card.pergunta = update.pergunta;
  }
}

describe("existing flashcard and deck operations backed by a vault", () => {
  it("shows server and vault records together, routes existing edits, and preserves offline access", async () => {
    const files = new FakeVaultCatalogFiles();
    const openVault = async (): Promise<ElectronVaultStudyStore> => new ElectronVaultStudyStore("vault", files);
    const readSession = (): string => "signed-in";
    const serverDecks = new FakeServerDecks();
    const serverCards = new FakeServerFlashcards();
    const decks = vaultAwareBaralhos(serverDecks, openVault, readSession);
    const flashcards = vaultAwareFlashcards(serverCards, openVault, readSession);

    expect((await decks.listBaralhos()).map((deck) => deck.id)).toEqual(["server-deck"]);
    expect((await flashcards.getFlashcards()).map((card) => card.id)).toEqual(["server-card"]);
    const { baralhoId } = await decks.createBaralho("Vault deck", []);
    const { flashcardId } = await flashcards.createFlashcard({ pergunta: "Vault question", resposta: "Vault answer" });
    expect((await decks.listBaralhos()).map((deck) => deck.id)).toEqual([baralhoId, "server-deck"]);
    expect((await flashcards.getFlashcards()).map((card) => card.id)).toEqual([flashcardId, "server-card"]);

    await decks.renameBaralho("server-deck", "Renamed on server");
    await flashcards.updateFlashcard("server-card", { pergunta: "Updated on server" });
    expect((await decks.getBaralho("server-deck")).titulo).toBe("Renamed on server");
    expect(serverCards.card.pergunta).toBe("Updated on server");
    serverDecks.online = false;
    serverCards.online = false;
    expect((await decks.listBaralhos()).map((deck) => deck.id)).toEqual([baralhoId]);
    expect((await flashcards.getFlashcards()).map((card) => card.id)).toEqual([flashcardId]);
    await expect(flashcards.deleteAllFlashcards()).resolves.toEqual({ count: 1 });
    serverCards.online = true;
    expect((await flashcards.getFlashcards()).map((card) => card.id)).toEqual(["server-card"]);
  });
  it("shares a card between screens and keeps it after removing or deleting the deck", async () => {
    const files = new FakeVaultCatalogFiles();
    const openVault = async (): Promise<ElectronVaultStudyStore> => new ElectronVaultStudyStore("vault", files);
    const decks = vaultAwareBaralhos(new HttpBaralhosAdapter(), openVault);
    const flashcards = vaultAwareFlashcards(new HttpFlashcardsAdapter(), openVault);

    const { flashcardId } = await flashcards.createFlashcard({ pergunta: "Question", resposta: "Answer" });
    const { baralhoId } = await decks.createBaralho("Biology", []);
    expect(await decks.listAvailableCards()).toEqual([{ id: flashcardId, pergunta: "Question", conceito: "" }]);
    await decks.addCards(baralhoId, [flashcardId, flashcardId]);
    await decks.renameBaralho(baralhoId, "Cells");
    await flashcards.updateFlashcard(flashcardId, { pergunta: "Updated question" });
    const details = await decks.getBaralho(baralhoId);
    expect(details.titulo).toBe("Cells");
    expect(details.cards).toEqual([expect.objectContaining({ id: flashcardId, pergunta: "Updated question" })]);

    await decks.removeCard(baralhoId, flashcardId);
    expect((await decks.getBaralho(baralhoId)).cards).toEqual([]);
    await decks.addCards(baralhoId, [flashcardId]);
    await decks.deleteBaralho(baralhoId);
    expect(await decks.listBaralhos()).toEqual([]);
    expect((await flashcards.getFlashcards())[0].id).toBe(flashcardId);
  });

  it("imports a legacy export and deletes its card from every deck", async () => {
    const files = new FakeVaultCatalogFiles();
    const openVault = async (): Promise<ElectronVaultStudyStore> => new ElectronVaultStudyStore("vault", files);
    const decks = vaultAwareBaralhos(new HttpBaralhosAdapter(), openVault);
    const flashcards = vaultAwareFlashcards(new HttpFlashcardsAdapter(), openVault);
    await expect(decks.importBaralhos({ title: "Legacy", cards: [{ title: "Question", answer: "Answer" }] }))
      .resolves.toEqual({ count: 1 });
    const [deck] = await decks.listBaralhos();
    const [card] = (await decks.getBaralho(deck.id)).cards;
    await flashcards.deleteFlashcard(card.id);
    expect(await flashcards.getFlashcards()).toEqual([]);
    expect((await decks.getBaralho(deck.id)).cards).toEqual([]);
  });
});
