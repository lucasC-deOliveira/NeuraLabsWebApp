import { describe, it, expect } from 'vitest';
import { associateFigures } from './associate-figures';
import type { ExamFigure, ExamPageLayout, FigureBox } from '../ports/exam-figure-source';

// Geometry mirrors the real ENEM booklet: A4-ish page, two columns split at x≈301.
const W = 602;
const H = 814;

function fig(x: number, y: number): ExamFigure {
  const bbox: FigureBox = { x, y, width: 200, height: 80 };
  return { bbox, mimetype: 'image/png', bytes: Buffer.from('x') };
}

function page(over: Partial<ExamPageLayout>): ExamPageLayout {
  return { width: W, height: H, markers: [], figures: [], ...over };
}

describe('associateFigures', () => {
  it('attributes a figure to the question above it in the same column', () => {
    const pages = [
      page({
        markers: [
          { numero: 91, x: 65, y: 692 },
          { numero: 92, x: 65, y: 347 },
        ],
        figures: [fig(67, 503)], // between Q91 (692) and Q92 (347) → Q91
      }),
    ];
    expect(associateFigures(pages).map((f) => f.numero)).toEqual([91]);
  });

  it('separates the two columns by x', () => {
    const pages = [
      page({
        markers: [
          { numero: 91, x: 65, y: 692 },
          { numero: 93, x: 377, y: 727 },
        ],
        figures: [fig(334, 424)], // right column, below Q93 → Q93 (not Q91)
      }),
    ];
    expect(associateFigures(pages).map((f) => f.numero)).toEqual([93]);
  });

  it('drops figures that precede every marker (e.g. cover page)', () => {
    const pages = [
      page({ figures: [fig(100, 400)] }), // cover: no markers
      page({ markers: [{ numero: 91, x: 65, y: 692 }], figures: [] }),
    ];
    expect(associateFigures(pages)).toEqual([]);
  });

  it('attributes a figure above the next page top to the continued question', () => {
    const pages = [
      page({ markers: [{ numero: 94, x: 377, y: 273 }] }), // last question of page 1
      page({
        markers: [{ numero: 95, x: 65, y: 400 }],
        figures: [fig(70, 760)], // top of page 2, above Q95 → still Q94
      }),
    ];
    expect(associateFigures(pages).map((f) => f.numero)).toEqual([94]);
  });
});
