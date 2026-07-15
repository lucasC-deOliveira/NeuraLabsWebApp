// Filtro e ordenação dos cartões DENTRO de um baralho aberto (a listagem de
// baralhos tem o seu próprio, em baralho-filters). Lógica pura.
// O casamento por tags é compartilhado com a lista de questões (@/lib).
import {
  matchesConceptTags,
  matchesTagText,
  conceptTagOptions,
  type ConceptTagOptions,
} from "@/lib/concept-tag-filters";
import type { BaralhoCard } from "../baralho.types";

export type BaralhoCardSort = "baralho" | "conceito" | "tipo";

export interface BaralhoCardCriteria {
  search: string;
  // "" = todos. Os três níveis vêm dos conceitos conectados no grafo.
  tipo: string;
  assuntoId: string;
  topicoId: string;
  conceito: string;
  sortBy: BaralhoCardSort;
}

export const DEFAULT_CARD_CRITERIA: BaralhoCardCriteria = {
  search: "",
  tipo: "",
  assuntoId: "",
  topicoId: "",
  conceito: "",
  sortBy: "baralho",
};

function matchesSearch(card: BaralhoCard, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    card.pergunta.toLowerCase().includes(term) ||
    card.resposta.toLowerCase().includes(term) ||
    card.conceito.toLowerCase().includes(term) ||
    matchesTagText(card.conceitosConectados, term)
  );
}

const COMPARATORS: Record<BaralhoCardSort, (a: BaralhoCard, b: BaralhoCard) => number> = {
  // "baralho" mantém a ordem que veio do servidor (mais recentes primeiro).
  baralho: () => 0,
  conceito: (a, b) => a.conceito.localeCompare(b.conceito),
  tipo: (a, b) => (a.tipo ?? "").localeCompare(b.tipo ?? ""),
};

/**
 * Aplica busca, tipo e os três níveis das tags, depois ordena. Não altera a lista.
 * @example filterAndSortBaralhoCards(cards, { ...DEFAULT_CARD_CRITERIA, assuntoId: "a1" })
 */
export function filterAndSortBaralhoCards(
  cards: BaralhoCard[],
  criteria: BaralhoCardCriteria,
): BaralhoCard[] {
  const result = cards.filter(
    (card) =>
      matchesSearch(card, criteria.search) &&
      (!criteria.tipo || card.tipo === criteria.tipo) &&
      matchesConceptTags(card, criteria),
  );
  return result.sort(COMPARATORS[criteria.sortBy]);
}

/**
 * Tipos presentes neste baralho, em ordem. O filtro só oferece o que existe aqui.
 * @example cardTipoOptions(cards) // ["DEFINICAO", "EXEMPLO"]
 */
export function cardTipoOptions(cards: BaralhoCard[]): string[] {
  const tipos = new Set<string>();
  for (const card of cards) if (card.tipo) tipos.add(card.tipo);
  return [...tipos].sort();
}

/** Níveis presentes nas tags deste baralho, para alimentar os filtros. */
export function cardTagOptions(cards: BaralhoCard[]): ConceptTagOptions {
  return conceptTagOptions(cards);
}

/** Filtros ativos, para o rótulo. A busca não conta: já está visível na tela. */
export function countActiveCardFilters(criteria: BaralhoCardCriteria): number {
  return [
    criteria.tipo || null,
    criteria.assuntoId || null,
    criteria.topicoId || null,
    criteria.conceito || null,
    criteria.sortBy !== "baralho" ? "1" : null,
  ].filter(Boolean).length;
}

/** Rótulo legível de um tipo de cartão (ERRO_COMUM → "erro comum"). */
export function formatTipoLabel(tipo: string): string {
  return tipo.replace("_", " ").toLowerCase();
}
