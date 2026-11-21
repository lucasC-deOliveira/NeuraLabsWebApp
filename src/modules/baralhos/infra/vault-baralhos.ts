import { readSrsLog, type LocalSrsLog } from "@/lib/srs-local";
import { getToken } from "@/lib/api";
import { baralhoTitulo } from "@contracts/baralhos";
import { normalizeImportedBaralhos } from "@contracts/baralho-import";
import { configuredStudyVault, selectStudyStorage, type ElectronVaultStudyStore, type VaultCard, type VaultDeck } from "@/modules/study/infra/electron-vault-study";
import { catalogVaultCards } from "@/modules/study/infra/vault-card-catalog";
import { availableStudyServer, mergeStudyRecords } from "@/modules/study/infra/available-study-server";
import type { BaralhosPort } from "../application/ports/baralhos.port";
import type { BaralhoCard, BaralhoCardOption, BaralhoDetail, BaralhoItem } from "../domain/baralho.types";

function deckItem(deck: VaultDeck, srs: LocalSrsLog, now: number): BaralhoItem {
  const schedules = deck.cards.map((card) => srs.schedule[card.id] ?? card.schedule);
  const due = schedules.filter((schedule) => schedule && Date.parse(schedule.proximaRevisao) <= now);
  return {
    id: deck.id, storage: "vault", titulo: deck.title, dataCriacao: new Date(deck.createdAt ?? 0), origens: deck.origins ?? [],
    totalCards: deck.cards.length, novos: schedules.filter((schedule) => schedule === null).length,
    aprender: due.filter((schedule) => schedule && schedule.dificuldade >= 4).length,
    revisar: due.filter((schedule) => schedule && schedule.dificuldade < 4).length,
  };
}

function localCardView(card: VaultCard, srs: LocalSrsLog): BaralhoCard {
  return {
    id: card.id, pergunta: card.question, resposta: card.answer, tipo: card.type ?? null,
    conceito: card.concept ?? "", conceitosConectados: card.conceptTags ?? [], schedule: srs.schedule[card.id] ?? card.schedule,
  };
}

function requireVaultDeck(decks: VaultDeck[], id: string): VaultDeck {
  const deck = decks.find((candidate) => candidate.id === id);
  if (!deck) throw new Error(`Invalid deck ID "${id}". Expected: an existing deck in the configured vault`);
  return deck;
}

class VaultBaralhos implements BaralhosPort {
  constructor(
    private readonly store: ElectronVaultStudyStore,
    private readonly server: BaralhosPort,
    private readonly session: () => string | null,
  ) {}

  async listBaralhos(): Promise<BaralhoItem[]> {
    const [library, srs, remote] = await Promise.all([
      this.store.read(), readSrsLog(this.store.folder),
      availableStudyServer(() => this.server.listBaralhos(), [], this.session),
    ]);
    const now = Date.now();
    return mergeStudyRecords(library.decks.map((deck) => deckItem(deck, srs, now)), remote);
  }

  async listAvailableCards(baralhoId?: string): Promise<BaralhoCardOption[]> {
    const library = await this.store.read();
    if (baralhoId && this.session() && !library.decks.some((deck) => deck.id === baralhoId)) {
      return this.server.listAvailableCards(baralhoId);
    }
    const cards = catalogVaultCards(library);
    return cards.map((card) => ({ id: card.id, pergunta: card.question, conceito: "" }));
  }

  async getBaralho(id: string): Promise<BaralhoDetail> {
    const [library, srs] = await Promise.all([this.store.read(), readSrsLog(this.store.folder)]);
    if (this.session() && !library.decks.some((deck) => deck.id === id)) return this.server.getBaralho(id);
    const deck = requireVaultDeck(library.decks, id);
    return { ...deckItem(deck, srs, Date.now()), cards: deck.cards.map((card) => localCardView(card, srs)) };
  }

  async createBaralho(titulo: string, flashcardIds: string[]): Promise<{ baralhoId: string }> {
    const baralhoId = crypto.randomUUID();
    const title = baralhoTitulo.parse(titulo);
    const createdAt = new Date().toISOString();
    await this.store.update((library) => ({
      ...library,
      decks: [...library.decks, {
        id: baralhoId, title, createdAt,
        cards: catalogVaultCards(library).filter((card) => flashcardIds.includes(card.id)),
      }],
    }));
    return { baralhoId };
  }

  async renameBaralho(id: string, titulo: string): Promise<void> {
    if (await this.isServerDeck(id)) return this.server.renameBaralho(id, titulo);
    const title = baralhoTitulo.parse(titulo);
    await this.changeDeck(id, (deck) => ({ ...deck, title }));
  }

  async deleteBaralho(id: string): Promise<void> {
    if (await this.isServerDeck(id)) return this.server.deleteBaralho(id);
    await this.store.update((library) => {
      requireVaultDeck(library.decks, id);
      return { ...library, cards: catalogVaultCards(library), decks: library.decks.filter((deck) => deck.id !== id) };
    });
  }

  async addCards(id: string, flashcardIds: string[]): Promise<void> {
    if (await this.isServerDeck(id)) return this.server.addCards(id, flashcardIds);
    await this.changeDeck(id, (deck, catalog) => {
      const existing = new Set(deck.cards.map((card) => card.id));
      const added = catalog.filter((card) => flashcardIds.includes(card.id) && !existing.has(card.id));
      return { ...deck, cards: [...deck.cards, ...added] };
    });
  }

  async removeCard(id: string, flashcardId: string): Promise<void> {
    if (await this.isServerDeck(id)) return this.server.removeCard(id, flashcardId);
    await this.changeDeck(id, (deck) => ({ ...deck, cards: deck.cards.filter((card) => card.id !== flashcardId) }));
  }

  async importBaralhos(payload: unknown): Promise<{ count: number }> {
    const createdAt = new Date().toISOString();
    const imported = normalizeImportedBaralhos(payload);
    if (!imported.length) throw new Error("Empty deck import. Expected: at least one deck with a complete flashcard");
    const decks = imported.map(({ titulo, cards }): VaultDeck => ({
      id: crypto.randomUUID(), title: titulo, createdAt, cards: cards.map(({ pergunta, resposta }): VaultCard => ({
        id: crypto.randomUUID(), question: pergunta, answer: resposta, schedule: null, createdAt,
      })),
    }));
    await this.store.update((library) => ({ ...library, decks: [...library.decks, ...decks] }));
    return { count: decks.length };
  }

  private async changeDeck(id: string, change: (deck: VaultDeck, catalog: VaultCard[]) => VaultDeck): Promise<void> {
    await this.store.update((library) => {
      const deck = requireVaultDeck(library.decks, id);
      const cards = catalogVaultCards(library);
      const next = change(deck, cards);
      return { ...library, cards, decks: library.decks.map((candidate) => candidate.id === id ? next : candidate) };
    });
  }

  private async isServerDeck(id: string): Promise<boolean> {
    if (!this.session()) return false;
    const { decks } = await this.store.read();
    return !decks.some((deck) => deck.id === id);
  }
}

/** Selects the configured vault for the existing deck CRUD operations.
 * @example const store = vaultAwareBaralhos(server)
 */
export function vaultAwareBaralhos(
  server: BaralhosPort, resolveVault: typeof configuredStudyVault = configuredStudyVault, session: () => string | null = getToken,
): BaralhosPort {
  const withStoragePort = selectStudyStorage<BaralhosPort>(server, (vault) => new VaultBaralhos(vault, server, session), resolveVault);
  return {
    listBaralhos: (): Promise<BaralhoItem[]> => withStoragePort((port) => port.listBaralhos()),
    listAvailableCards: (id): Promise<BaralhoCardOption[]> => withStoragePort((port) => port.listAvailableCards(id)),
    getBaralho: (id): Promise<BaralhoDetail> => withStoragePort((port) => port.getBaralho(id)),
    createBaralho: (title, ids): Promise<{ baralhoId: string }> => withStoragePort((port) => port.createBaralho(title, ids)),
    renameBaralho: (id, title): Promise<void> => withStoragePort((port) => port.renameBaralho(id, title)),
    deleteBaralho: (id): Promise<void> => withStoragePort((port) => port.deleteBaralho(id)),
    addCards: (id, ids): Promise<void> => withStoragePort((port) => port.addCards(id, ids)),
    removeCard: (id, flashcardId): Promise<void> => withStoragePort((port) => port.removeCard(id, flashcardId)),
    importBaralhos: (payload): Promise<{ count: number }> => withStoragePort((port) => port.importBaralhos(payload)),
  };
}
