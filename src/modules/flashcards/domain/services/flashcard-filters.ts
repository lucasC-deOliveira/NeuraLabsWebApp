// Pure filter / sort / stats pipeline for the flashcards list.
import type { FlashcardConceptTag, FlashcardItem, TipoFlashcard } from "../flashcard.types";
import { isOverdue, isDue } from "./srs-status";

export type StatusFilter = "all" | "due" | "not-due" | "overdue" | "new" | "mastered";
export type FlashcardSort = "date" | "difficulty" | "interval" | "alpha";
export type TipoFilter = TipoFlashcard | "";

export interface FlashcardCriteria {
  search: string;
  assuntoFilter: string;
  topicoFilter: string;
  tipoFilter: TipoFilter;
  statusFilter: StatusFilter;
  sortBy: FlashcardSort;
}

export interface FlashcardStats {
  total: number;
  due: number;
  overdue: number;
  mastered: number;
  newCount: number;
}

const HOUR_MS = 3_600_000;
const MASTERED_STAGE = 5;

function matchesSearch(fc: FlashcardItem, search: string): boolean {
  if (!search) return true;
  const l = search.toLowerCase();
  return matchesOwnText(fc, l) || matchesTagText(fc.conceitosConectados, l);
}

function matchesOwnText(fc: FlashcardItem, lowered: string): boolean {
  return (
    fc.pergunta.toLowerCase().includes(lowered) ||
    fc.resposta.toLowerCase().includes(lowered) ||
    (fc.conceito ?? "").toLowerCase().includes(lowered) ||
    fc.topico.toLowerCase().includes(lowered) ||
    fc.assunto.toLowerCase().includes(lowered)
  );
}

// A busca cobre as tags exibidas no card (conceitos conectados no grafo + pais).
function matchesTagText(tags: FlashcardConceptTag[], lowered: string): boolean {
  return tags.some(
    (t) =>
      t.conceito.toLowerCase().includes(lowered) ||
      t.topico.toLowerCase().includes(lowered) ||
      t.assunto.toLowerCase().includes(lowered),
  );
}

// Assunto/tópico casam pelo conceito base OU por qualquer conceito conectado no
// grafo — o card exibe as duas origens como tag, então as duas têm de filtrar.
function matchesAssunto(fc: FlashcardItem, assuntoId: string): boolean {
  if (!assuntoId) return true;
  return fc.assuntoId === assuntoId || fc.conceitosConectados.some((t) => t.assuntoId === assuntoId);
}

function matchesTopico(fc: FlashcardItem, topicoId: string): boolean {
  if (!topicoId) return true;
  return fc.topicoId === topicoId || fc.conceitosConectados.some((t) => t.topicoId === topicoId);
}

function matchesTipo(fc: FlashcardItem, tipo: TipoFilter): boolean {
  return !tipo || fc.tipo === tipo;
}

function matchesStatus(fc: FlashcardItem, status: StatusFilter, now: Date): boolean {
  if (status === "all") return true;
  const sr = fc.spacedRepetition;
  if (!sr) return status === "new";
  switch (status) {
    case "overdue": return isOverdue(sr, now);
    case "due": return isDue(sr, now);
    case "not-due": return !isOverdue(sr, now) && !isDue(sr, now);
    case "new": return sr.estagioAprendizado <= 1;
    case "mastered": return sr.estagioAprendizado === MASTERED_STAGE;
    default: return true;
  }
}

const difficultyOf = (fc: FlashcardItem): number => fc.spacedRepetition?.dificuldade ?? 999;
const intervalOf = (fc: FlashcardItem): number => fc.spacedRepetition?.intervalo ?? 99999;
const createdMs = (fc: FlashcardItem): number => new Date(fc.dataCriacao).getTime();

const COMPARATORS: Record<FlashcardSort, (a: FlashcardItem, b: FlashcardItem) => number> = {
  alpha: (a, b) => (a.conceito ?? "").localeCompare(b.conceito ?? ""),
  difficulty: (a, b) => difficultyOf(a) - difficultyOf(b),
  interval: (a, b) => intervalOf(a) - intervalOf(b),
  date: (a, b) => createdMs(b) - createdMs(a),
};

/** Applies search + subject + topic + status filters, then sorts. */
export function filterAndSortFlashcards(
  cards: FlashcardItem[],
  criteria: FlashcardCriteria,
  now: Date = new Date(),
): FlashcardItem[] {
  const result = cards.filter(
    (fc) =>
      matchesSearch(fc, criteria.search) &&
      matchesAssunto(fc, criteria.assuntoFilter) &&
      matchesTopico(fc, criteria.topicoFilter) &&
      matchesTipo(fc, criteria.tipoFilter) &&
      matchesStatus(fc, criteria.statusFilter, now),
  );
  return result.sort(COMPARATORS[criteria.sortBy]);
}

/** Header counters: total, due-today, overdue, mastered and new/starting. */
export function computeFlashcardStats(cards: FlashcardItem[], now: Date = new Date()): FlashcardStats {
  let due = 0, overdue = 0, mastered = 0, newCount = 0;
  for (const c of cards) {
    const sr = c.spacedRepetition;
    if (!sr) { newCount++; continue; }
    if (sr.estagioAprendizado === MASTERED_STAGE) { mastered++; continue; }
    const diffHours = (new Date(sr.proximaRevisao).getTime() - now.getTime()) / HOUR_MS;
    if (diffHours < 0) overdue++;
    if (diffHours < 24) due++;
    if (sr.estagioAprendizado <= 1) newCount++;
  }
  return { total: cards.length, due, overdue, mastered, newCount };
}

/** Count of non-default (active) filters, for the badge. */
export function countActiveFilters(criteria: FlashcardCriteria): number {
  return [
    criteria.assuntoFilter || null,
    criteria.topicoFilter || null,
    criteria.tipoFilter || null,
    criteria.statusFilter !== "all" ? "1" : null,
    criteria.sortBy !== "date" ? "1" : null,
  ].filter(Boolean).length;
}
