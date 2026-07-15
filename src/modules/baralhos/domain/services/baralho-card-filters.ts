// Filtro e ordenação dos cartões DENTRO de um baralho aberto (a listagem de
// baralhos tem o seu próprio, em baralho-filters). Lógica pura.
import type { BaralhoCard, BaralhoConceptTag } from "../baralho.types";

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

function matchesTagText(tags: BaralhoConceptTag[], term: string): boolean {
  return tags.some(
    (t) =>
      t.conceito.toLowerCase().includes(term) ||
      t.topico.toLowerCase().includes(term) ||
      t.assunto.toLowerCase().includes(term),
  );
}

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

// Um cartão pode estar ligado a vários conceitos: casar por qualquer um deles.
function matchesTags(card: BaralhoCard, criteria: BaralhoCardCriteria): boolean {
  const tags = card.conceitosConectados;
  return (
    (!criteria.assuntoId || tags.some((t) => t.assuntoId === criteria.assuntoId)) &&
    (!criteria.topicoId || tags.some((t) => t.topicoId === criteria.topicoId)) &&
    (!criteria.conceito || tags.some((t) => t.conceito === criteria.conceito))
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
      matchesTags(card, criteria),
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

export interface AssuntoOption {
  id: string;
  nome: string;
}

export interface TopicoOption {
  id: string;
  nome: string;
  assuntoId: string;
}

export interface CardTagOptions {
  assuntos: AssuntoOption[];
  topicos: TopicoOption[];
  conceitos: string[];
}

const byNome = (a: { nome: string }, b: { nome: string }): number => a.nome.localeCompare(b.nome);

/**
 * Assuntos, tópicos e conceitos distintos presentes nas tags deste baralho — os
 * filtros só oferecem o que existe aqui dentro.
 * @example cardTagOptions(cards).assuntos // [{ id: "a1", nome: "Biologia" }]
 */
interface TagAccumulator {
  assuntos: Map<string, AssuntoOption>;
  topicos: Map<string, TopicoOption>;
  conceitos: Set<string>;
}

function collectTag(acc: TagAccumulator, tag: BaralhoConceptTag): void {
  if (tag.assuntoId) acc.assuntos.set(tag.assuntoId, { id: tag.assuntoId, nome: tag.assunto });
  if (tag.topicoId) {
    acc.topicos.set(tag.topicoId, { id: tag.topicoId, nome: tag.topico, assuntoId: tag.assuntoId });
  }
  if (tag.conceito) acc.conceitos.add(tag.conceito);
}

export function cardTagOptions(cards: BaralhoCard[]): CardTagOptions {
  const assuntos = new Map<string, AssuntoOption>();
  const topicos = new Map<string, TopicoOption>();
  const conceitos = new Set<string>();
  for (const card of cards) {
    for (const tag of card.conceitosConectados) collectTag({ assuntos, topicos, conceitos }, tag);
  }
  return {
    assuntos: [...assuntos.values()].sort(byNome),
    topicos: [...topicos.values()].sort(byNome),
    conceitos: [...conceitos].sort((a, b) => a.localeCompare(b)),
  };
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
