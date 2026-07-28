// Cache local da listagem de flashcards — para reabrir a página instantaneamente
// (stale-while-revalidate). A página busca tudo de uma vez e filtra no cliente,
// então o cache é um snapshot único (sem chave por filtro). Sobre o CacheStore
// unificado.
import type {
  AssuntoOption,
  ConceptOption,
  FlashcardItem,
  SpacedRepetition,
} from "../../domain/flashcard.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";

// Tag da área "flashcards": criar/apagar/editar card invalida.
export const FLASHCARDS_TAG = "flashcards";

export interface FlashcardsSnapshot {
  cards: FlashcardItem[];
  filterData: AssuntoOption[];
  concepts: ConceptOption[];
}

// JSON serializa Date como string; a lista ordena por data e formata o vencimento
// da revisão, então as datas voltam a ser Date na leitura.
function reviveSrs(sr: SpacedRepetition | null): SpacedRepetition | null {
  if (!sr) return null;
  return {
    ...sr,
    proximaRevisao: new Date(sr.proximaRevisao),
    ultimaRevisao: new Date(sr.ultimaRevisao),
  };
}

function reviveCard(c: FlashcardItem): FlashcardItem {
  return {
    ...c,
    dataCriacao: new Date(c.dataCriacao),
    spacedRepetition: reviveSrs(c.spacedRepetition),
  };
}

function reviveSnapshot(snapshot: FlashcardsSnapshot): FlashcardsSnapshot {
  return { ...snapshot, cards: snapshot.cards.map(reviveCard) };
}

// Fronteira não confiável: sem o array de cards, o revive quebraria ao iterar.
function isUsable(snapshot: FlashcardsSnapshot): boolean {
  return Array.isArray(snapshot?.cards);
}

const slot: CacheSlot<FlashcardsSnapshot> = cacheStore.slot({
  key: "flashcards",
  version: 1,
  tags: [FLASHCARDS_TAG],
  accept: isUsable,
  revive: reviveSnapshot,
});

export function loadCachedFlashcards(): FlashcardsSnapshot | null {
  return slot.read();
}

export function saveCachedFlashcards(snapshot: FlashcardsSnapshot): void {
  slot.write(snapshot);
}

/** Invalida a listagem cacheada — chamar após criar/apagar/editar um flashcard. */
export function invalidateFlashcardsList(): void {
  cacheStore.invalidateTag(FLASHCARDS_TAG);
}
