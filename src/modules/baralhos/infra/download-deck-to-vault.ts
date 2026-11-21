import { ApiError, getOfflineAccountId, getToken, resolveApiUrl } from "@/lib/api";
import { configuredStudyVault, type ElectronVaultStudyStore, type VaultCard } from "@/modules/study/infra/electron-vault-study";
import { catalogVaultCards } from "@/modules/study/infra/vault-card-catalog";
import type { BaralhoCard, BaralhoDetail } from "../domain/baralho.types";
import { VaultDeckDownloadError } from "../application/vault-deck-download-error";
import { remoteBaralhos } from "./http";

function downloadedVaultCard(card: BaralhoCard): VaultCard {
  const schedule = card.schedule;
  if (schedule === undefined) {
    throw new VaultDeckDownloadError("schedule-unavailable", `Missing schedule for "${card.id}". Expected: schedule or null`);
  }
  if (schedule && schedule.fase !== "LEARN" && schedule.fase !== "REVIEW" && schedule.fase !== "RELEARN") {
    throw new VaultDeckDownloadError("schedule-unavailable", `Invalid schedule phase "${schedule.fase}". Expected: LEARN|REVIEW|RELEARN`);
  }
  return {
    id: card.id, question: card.pergunta, answer: card.resposta, type: card.tipo,
    concept: card.conceito, conceptTags: card.conceitosConectados,
    schedule: schedule && { ...schedule, fase: schedule.fase as NonNullable<VaultCard["schedule"]>["fase"] },
  };
}

/** Saves a server deck under its existing IDs and preserves local edits.
 * @example await storeServerDeckInVault(vault, serverDeck)
 */
export async function storeServerDeckInVault(
  store: ElectronVaultStudyStore, deck: BaralhoDetail, downloadedFrom?: { accountId: string; serverUrl: string },
): Promise<void> {
  const downloadedCards = deck.cards.map(downloadedVaultCard);
  const createdAt = deck.dataCriacao.toISOString();
  await store.update((library) => {
    if (library.decks.some((candidate) => candidate.id === deck.id)) return library;
    const localCards = new Map(catalogVaultCards(library).map((card) => [card.id, card]));
    const cards = downloadedCards.map((card) => localCards.get(card.id) ?? card);
    const localDeck = { id: deck.id, title: deck.titulo, createdAt, origins: deck.origens, cards, downloadedFrom };
    return { ...library, decks: [...library.decks, localDeck] };
  });
}

/** Downloads one server deck to the configured folder after an explicit user action.
 * @example await downloadDeckToVault(deckId)
 */
export async function downloadDeckToVault(deckId: string): Promise<void> {
  const store = await configuredStudyVault();
  const token = getToken();
  const server = resolveApiUrl();
  const accountId = getOfflineAccountId();
  if (!store) throw new VaultDeckDownloadError("vault-not-configured", "Missing vault folder. Expected: a folder selected in settings");
  if (!token) throw new VaultDeckDownloadError("session-required", "Missing server session. Expected: a signed-in session");
  const deck = await fetchServerDeck(deckId);
  if (getToken() !== token || resolveApiUrl() !== server) {
    throw new VaultDeckDownloadError("session-required", "Server session changed. Expected: the session that requested the download");
  }
  try {
    await storeServerDeckInVault(store, deck, accountId ? { accountId, serverUrl: server } : undefined);
  } catch (error) {
    if (error instanceof VaultDeckDownloadError) throw error;
    throw new VaultDeckDownloadError("vault-write-failed", `Could not save deck "${deckId}". Expected: a writable vault with valid study data`, error);
  }
}

async function fetchServerDeck(deckId: string): Promise<BaralhoDetail> {
  try {
    return await remoteBaralhos.getBaralho(deckId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new VaultDeckDownloadError("session-required", "Server rejected the session with 401. Expected: a valid session", error);
    }
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      throw new VaultDeckDownloadError("deck-unavailable", `Server could not return deck "${deckId}". Expected: an accessible deck ID`, error);
    }
    throw new VaultDeckDownloadError("server-unavailable", `Failed to fetch deck "${deckId}". Expected: a successful deck response`, error);
  }
}
