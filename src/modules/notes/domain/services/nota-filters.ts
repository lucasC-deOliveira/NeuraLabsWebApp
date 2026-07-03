// Pure filter / sort / stats pipeline for the notes list.
import type { NotaListItem } from "../nota.types";

export type SortOrder = "date-desc" | "date-asc" | "alpha" | "words-desc" | "fc-desc";
export type TimeBucket = "today" | "week" | "month" | "older";
export type TimeFilter = "all" | TimeBucket;
export type FcFilter = "all" | "has-fc" | "no-fc";

export interface NotesFilterCriteria {
  search: string;
  conceptFilter: string;
  timeFilter: TimeFilter;
  fcFilter: FcFilter;
  sortBy: SortOrder;
}

export interface NotesStats {
  total: number;
  withFc: number;
  noFc: number;
  totalWords: number;
  conceptCount: number;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Age bucket of a note relative to `now` (defaults to the current time). */
export function getTimeBucket(date: Date, now: Date = new Date()): TimeBucket {
  const diffMs = now.getTime() - new Date(date).getTime();
  if (Math.floor(diffMs / HOUR_MS) < 24) return "today";
  const diffDays = Math.floor(diffMs / DAY_MS);
  if (diffDays < 7) return "week";
  if (diffDays < 30) return "month";
  return "older";
}

function matchesSearch(nota: NotaListItem, search: string): boolean {
  if (!search) return true;
  const l = search.toLowerCase();
  return nota.titulo.toLowerCase().includes(l) || nota.preview.toLowerCase().includes(l);
}

function matchesFc(nota: NotaListItem, fcFilter: FcFilter): boolean {
  if (fcFilter === "has-fc") return nota.flashcardCount > 0;
  if (fcFilter === "no-fc") return nota.flashcardCount === 0;
  return true;
}

function compareNotas(a: NotaListItem, b: NotaListItem, sortBy: SortOrder): number {
  switch (sortBy) {
    case "date-asc": return new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime();
    case "alpha": return a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" });
    case "words-desc": return b.wordCount - a.wordCount;
    case "fc-desc": return b.flashcardCount - a.flashcardCount;
    default: return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
  }
}

/** Applies search + concept + time + flashcard filters, then sorts. */
export function filterAndSortNotas(
  notas: NotaListItem[],
  criteria: NotesFilterCriteria,
  now: Date = new Date(),
): NotaListItem[] {
  const result = notas.filter(
    (n) =>
      matchesSearch(n, criteria.search) &&
      (!criteria.conceptFilter || n.conceitosRelacionados.some((c) => c.id === criteria.conceptFilter)) &&
      (criteria.timeFilter === "all" || getTimeBucket(n.dataCriacao, now) === criteria.timeFilter) &&
      matchesFc(n, criteria.fcFilter),
  );
  return result.sort((a, b) => compareNotas(a, b, criteria.sortBy));
}

/** Aggregate counters shown in the stats bar. */
export function computeNotesStats(notas: NotaListItem[]): NotesStats {
  const conceptSet = new Set<string>();
  let withFc = 0;
  let totalWords = 0;
  for (const n of notas) {
    if (n.flashcardCount > 0) withFc++;
    totalWords += n.wordCount;
    for (const c of n.conceitosRelacionados) conceptSet.add(c.id);
  }
  return { total: notas.length, withFc, noFc: notas.length - withFc, totalWords, conceptCount: conceptSet.size };
}

/** Count of non-default (active) filters, for the badge. */
export function countActiveFilters(criteria: NotesFilterCriteria): number {
  return [
    criteria.conceptFilter || null,
    criteria.timeFilter !== "all" ? "1" : null,
    criteria.fcFilter !== "all" ? "1" : null,
    criteria.sortBy !== "date-desc" ? "1" : null,
  ].filter(Boolean).length;
}
