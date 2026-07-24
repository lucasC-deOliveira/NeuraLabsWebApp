import { describe, it, expect } from 'vitest';
import { summarizeReviews } from './flashcard-item-summary';
import type { ReviewRow } from '../ports/flashcard-analytics-source';

function review(acertou: boolean, nivelConfianca: number): ReviewRow {
  return {
    data: new Date('2026-01-01'),
    acertou,
    nivelConfianca,
    tempoResposta: null,
    tipoErro: null,
  };
}

describe('summarizeReviews', () => {
  it('returns null metrics when there are no reviews', () => {
    expect(summarizeReviews([])).toEqual({
      reviews: 0,
      wrong: 0,
      accuracy: null,
      avgConfidence: null,
    });
  });

  it('computes totals, accuracy and average confidence', () => {
    const rows = [review(true, 5), review(false, 1), review(true, 3), review(true, 4)];
    const summary = summarizeReviews(rows);
    expect(summary.reviews).toBe(4);
    expect(summary.wrong).toBe(1);
    expect(summary.accuracy).toBe(75);
    expect(summary.avgConfidence).toBe(3.3); // (5+1+3+4)/4 = 3.25 → 3.3
  });
});
