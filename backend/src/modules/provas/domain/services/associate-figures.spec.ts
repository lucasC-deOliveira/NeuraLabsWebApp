import { describe, it, expect } from 'vitest';
import { associateFigures } from './associate-figures';
import type { ExamFigure, ExamPageLayout, FigureBox } from '../ports/exam-figure-source';

// Geometry mirrors the real ENEM booklet: A4-ish page, two columns split at x≈301.
const W = 602;
const H = 814;

function fig(x: number, y: number): ExamFigure {
  const bbox: FigureBox = { x, y, width: 200, height: 60 };
  return { bbox, mimetype: 'image/png', bytes: Buffer.from('x') };
}

function page(over: Partial<ExamPageLayout>): ExamPageLayout {
  return { width: W, height: H, markers: [], alternativeMarkers: [], figures: [], ...over };
}

describe('associateFigures', () => {
  it('attributes a stem figure (above the alternatives) to the question, alternativa null', () => {
    const pages = [
      page({
        markers: [{ numero: 91, x: 65, y: 692 }],
        figures: [fig(67, 503)], // below the marker, no alternatives → stem
      }),
    ];
    expect(associateFigures(pages)).toEqual([
      expect.objectContaining({ numero: 91, alternativa: null }),
    ]);
  });

  it('separates the two columns by x', () => {
    const pages = [
      page({
        markers: [
          { numero: 91, x: 65, y: 692 },
          { numero: 93, x: 377, y: 727 },
        ],
        figures: [fig(334, 424)], // right column → Q93 (not Q91)
      }),
    ];
    expect(associateFigures(pages).map((f) => f.numero)).toEqual([93]);
  });

  it('attributes each figure under a letter to that alternative (image answers)', () => {
    // Q96: stem, then A–E letters each with a figure just below it.
    const pages = [
      page({
        markers: [{ numero: 96, x: 334, y: 727 }],
        alternativeMarkers: [
          { letra: 'A', x: 334, y: 527 },
          { letra: 'B', x: 334, y: 426 },
          { letra: 'C', x: 334, y: 325 },
          { letra: 'D', x: 334, y: 225 },
          { letra: 'E', x: 334, y: 124 },
        ],
        figures: [fig(340, 478), fig(340, 378), fig(340, 277), fig(340, 177), fig(340, 76)],
      }),
    ];
    expect(associateFigures(pages).map((f) => f.alternativa)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('keeps a stem figure null while the answer figures map to letters', () => {
    // Q95: genetics figure above A, then five answer figures under A–E.
    const pages = [
      page({
        markers: [{ numero: 95, x: 65, y: 727 }],
        alternativeMarkers: [
          { letra: 'A', x: 65, y: 431 },
          { letra: 'B', x: 65, y: 349 },
          { letra: 'C', x: 65, y: 267 },
          { letra: 'D', x: 65, y: 184 },
          { letra: 'E', x: 65, y: 103 },
        ],
        figures: [fig(70, 502), fig(70, 404), fig(70, 322), fig(70, 241), fig(70, 158), fig(70, 76)],
      }),
    ];
    expect(associateFigures(pages).map((f) => f.alternativa)).toEqual([null, 'A', 'B', 'C', 'D', 'E']);
  });

  it('ignores a stray lone letter that is not part of an A→E run', () => {
    const pages = [
      page({
        markers: [{ numero: 91, x: 65, y: 692 }],
        alternativeMarkers: [{ letra: 'A', x: 65, y: 600 }], // lone A in the stem
        figures: [fig(67, 550)], // below that A, but no B–E run → still stem (null)
      }),
    ];
    expect(associateFigures(pages)[0].alternativa).toBeNull();
  });

  it('drops figures that precede every marker (e.g. cover page)', () => {
    const pages = [page({ figures: [fig(100, 400)] })];
    expect(associateFigures(pages)).toEqual([]);
  });
});
