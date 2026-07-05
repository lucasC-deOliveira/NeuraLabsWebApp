import type { ExamFigure, ExamPageLayout } from '../ports/exam-figure-source';

// Attributes each extracted figure to the question it belongs to — and, when the
// figure sits under an alternative letter (image answers), to that alternative.
// Everything is by reading order: page → column (left before right) → vertical
// position (top before bottom). A figure belongs to the last question marker that
// opens before it; within that question, it belongs to the last alternative marker
// before it (or to the stem/enunciado — alternativa null — if none precedes it).
// This also handles questions continuing into the next column/page. Figures before
// any marker (e.g. on the cover) are dropped.

export interface FiguraDaQuestao {
  numero: number;
  alternativa: string | null;
  figure: ExamFigure;
}

const COLUMN_SPAN = 100_000;
const PAGE_SPAN = 1_000_000;
const ALT_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function columnOf(x: number, width: number): number {
  return x < width / 2 ? 0 : 1;
}

// Larger y (higher on the page) ranks earlier within a column.
function readingRank(pageIndex: number, x: number, y: number, page: ExamPageLayout): number {
  const column = columnOf(x, page.width);
  return pageIndex * PAGE_SPAN + column * COLUMN_SPAN + (page.height - y);
}

interface RankedQuestion {
  numero: number;
  rank: number;
}

interface RankedAlt {
  letra: string;
  numero: number;
  rank: number;
}

function orderedQuestions(pages: ExamPageLayout[]): RankedQuestion[] {
  return pages
    .flatMap((page, pageIndex) =>
      page.markers.map((m) => ({ numero: m.numero, rank: readingRank(pageIndex, m.x, m.y, page) })),
    )
    .sort((a, b) => a.rank - b.rank);
}

// The question that opens at or before this rank, or null if none precedes it.
function questionAtOrBefore(questions: RankedQuestion[], rank: number): RankedQuestion | null {
  let found: RankedQuestion | null = null;
  for (const question of questions) {
    if (question.rank > rank) break;
    found = question;
  }
  return found;
}

// Keeps only the last consecutive A→B→C→D→E run of a question's letter markers,
// so a stray lone letter in the stem is not mistaken for an alternative.
function lastAeRun(sorted: RankedAlt[]): RankedAlt[] {
  for (let start = sorted.length - ALT_LETTERS.length; start >= 0; start--) {
    if (ALT_LETTERS.every((letra, k) => sorted[start + k].letra === letra)) {
      return sorted.slice(start, start + ALT_LETTERS.length);
    }
  }
  return [];
}

function groupByNumero(alts: RankedAlt[]): Map<number, RankedAlt[]> {
  const byNumero = new Map<number, RankedAlt[]>();
  for (const alt of alts) {
    const list = byNumero.get(alt.numero) ?? [];
    list.push(alt);
    byNumero.set(alt.numero, list);
  }
  return byNumero;
}

function rankedAlternative(
  marker: { letra: string; x: number; y: number },
  pageIndex: number,
  page: ExamPageLayout,
  questions: RankedQuestion[],
): RankedAlt | null {
  const rank = readingRank(pageIndex, marker.x, marker.y, page);
  const question = questionAtOrBefore(questions, rank);
  return question ? { letra: marker.letra, numero: question.numero, rank } : null;
}

function validatedAlternatives(pages: ExamPageLayout[], questions: RankedQuestion[]): RankedAlt[] {
  const candidates = pages.flatMap((page, pageIndex) =>
    page.alternativeMarkers.flatMap((m) => {
      const alt = rankedAlternative(m, pageIndex, page, questions);
      return alt ? [alt] : [];
    }),
  );
  const runs = [...groupByNumero(candidates).values()].flatMap((group) =>
    lastAeRun(group.sort((a, b) => a.rank - b.rank)),
  );
  return runs.sort((a, b) => a.rank - b.rank);
}

// The alternative whose letter opens between the question marker and the figure.
function alternativaFor(alts: RankedAlt[], q: RankedQuestion, figRank: number): string | null {
  let found: string | null = null;
  for (const alt of alts) {
    if (alt.numero !== q.numero || alt.rank <= q.rank || alt.rank > figRank) continue;
    found = alt.letra;
  }
  return found;
}

// Rank a figure by its bottom edge: an alternative's letter labels the top of its
// block and the figure hangs just below it, so the bottom sits under the right
// letter (and above the next). The center x picks the column.
function figureRank(pageIndex: number, figure: ExamFigure, page: ExamPageLayout): number {
  const cx = figure.bbox.x + figure.bbox.width / 2;
  return readingRank(pageIndex, cx, figure.bbox.y, page);
}

/**
 * Maps figures to their owning question and (optional) alternative, in reading order.
 * @example associateFigures(layout.pages) // → [{ numero: 96, alternativa: 'A', figure }, ...]
 */
export function associateFigures(pages: ExamPageLayout[]): FiguraDaQuestao[] {
  const questions = orderedQuestions(pages);
  const alts = validatedAlternatives(pages, questions);
  return pages.flatMap((page, pageIndex) =>
    page.figures.flatMap((figure) => {
      const figRank = figureRank(pageIndex, figure, page);
      const question = questionAtOrBefore(questions, figRank);
      if (!question) return [];
      return [
        { numero: question.numero, alternativa: alternativaFor(alts, question, figRank), figure },
      ];
    }),
  );
}
