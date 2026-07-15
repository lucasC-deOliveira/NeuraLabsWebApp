// Cache local (localStorage) da listagem de flashcards — para reabrir a página
// instantaneamente (stale-while-revalidate): mostra o último payload na hora e
// revalida no backend em segundo plano. A página busca tudo de uma vez e filtra no
// cliente, então o cache é um snapshot único (sem chave por filtro).
// Falhas de leitura/escrita são silenciosas (o cache é só uma otimização).
import type {
  AssuntoOption,
  ConceptOption,
  FlashcardItem,
  SpacedRepetition,
} from "../../domain/flashcard.types";

// Versionada: um payload antigo com formato diferente é ignorado em vez de quebrar a lista.
const KEY = "neuralabs.flashcards-cache.v1";

export interface FlashcardsSnapshot {
  cards: FlashcardItem[];
  filterData: AssuntoOption[];
  concepts: ConceptOption[];
}

export function loadCachedFlashcards(): FlashcardsSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FlashcardsSnapshot;
    return { ...parsed, cards: parsed.cards.map(reviveCard) };
  } catch {
    return null;
  }
}

export function saveCachedFlashcards(snapshot: FlashcardsSnapshot): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // quota estourada / modo privado — o cache é apenas uma otimização.
  }
}

// JSON serializa Date como string; a lista ordena por data e formata o vencimento
// da revisão, então as datas voltam a ser Date na leitura.
function reviveCard(c: FlashcardItem): FlashcardItem {
  return {
    ...c,
    dataCriacao: new Date(c.dataCriacao),
    spacedRepetition: reviveSrs(c.spacedRepetition),
  };
}

function reviveSrs(sr: SpacedRepetition | null): SpacedRepetition | null {
  if (!sr) return null;
  return {
    ...sr,
    proximaRevisao: new Date(sr.proximaRevisao),
    ultimaRevisao: new Date(sr.ultimaRevisao),
  };
}
