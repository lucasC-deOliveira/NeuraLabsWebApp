import type { ExamFigure, ExamPageLayout } from '../ports/exam-figure-source';

// Attributes each extracted figure to the question it belongs to, by reading
// order: page → column (left before right) → vertical position (top before
// bottom). A figure belongs to the last question marker that opens before it in
// that order — which also handles questions that continue into the next
// column/page (a figure above a column's first marker falls to the previous
// question). Figures before any marker (e.g. on the cover) are dropped.

export interface FiguraDaQuestao {
  numero: number;
  figure: ExamFigure;
}

// Reading-order rank; larger y (higher on the page) ranks earlier within a column.
const COLUMN_SPAN = 100_000;
const PAGE_SPAN = 1_000_000;

function columnOf(x: number, width: number): number {
  return x < width / 2 ? 0 : 1;
}

function readingRank(pageIndex: number, x: number, y: number, page: ExamPageLayout): number {
  const column = columnOf(x, page.width);
  return pageIndex * PAGE_SPAN + column * COLUMN_SPAN + (page.height - y);
}

interface RankedMarker {
  numero: number;
  rank: number;
}

function orderedMarkers(pages: ExamPageLayout[]): RankedMarker[] {
  const ranked = pages.flatMap((page, pageIndex) =>
    page.markers.map((m) => ({ numero: m.numero, rank: readingRank(pageIndex, m.x, m.y, page) })),
  );
  return ranked.sort((a, b) => a.rank - b.rank);
}

// The last marker that opens at or before this rank, or null if none precedes it.
function numeroAtOrBefore(markers: RankedMarker[], rank: number): number | null {
  let found: number | null = null;
  for (const marker of markers) {
    if (marker.rank > rank) break;
    found = marker.numero;
  }
  return found;
}

function figureRank(pageIndex: number, figure: ExamFigure, page: ExamPageLayout): number {
  const cx = figure.bbox.x + figure.bbox.width / 2;
  const cy = figure.bbox.y + figure.bbox.height / 2;
  return readingRank(pageIndex, cx, cy, page);
}

/**
 * Maps figures to their owning question number, in reading order.
 * @example associateFigures(layout.pages) // → [{ numero: 91, figure }, ...]
 */
export function associateFigures(pages: ExamPageLayout[]): FiguraDaQuestao[] {
  const markers = orderedMarkers(pages);
  return pages.flatMap((page, pageIndex) =>
    page.figures.flatMap((figure) => {
      const numero = numeroAtOrBefore(markers, figureRank(pageIndex, figure, page));
      return numero === null ? [] : [{ numero, figure }];
    }),
  );
}
