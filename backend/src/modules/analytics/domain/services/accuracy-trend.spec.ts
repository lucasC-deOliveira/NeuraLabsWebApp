import { describe, it, expect } from 'vitest';
import { accuracyTrend } from './accuracy-trend';
import type { ReviewRow } from '../ports/flashcard-analytics-source';

const review = (data: string, acertou: boolean): ReviewRow => ({
  data: new Date(data),
  acertou,
  nivelConfianca: 3,
  tempoResposta: 5000,
  tipoErro: null,
});

describe('accuracyTrend', () => {
  it('groups reviews per day with accuracy and count, in chronological order', () => {
    const out = accuracyTrend([
      review('2026-07-20T10:00:00Z', true),
      review('2026-07-20T11:00:00Z', false),
      review('2026-07-21T10:00:00Z', true),
    ]);
    expect(out).toEqual([
      { date: '2026-07-20', accuracy: 50, reviews: 2 },
      { date: '2026-07-21', accuracy: 100, reviews: 1 },
    ]);
  });

  it('is empty with no reviews', () => {
    expect(accuracyTrend([])).toEqual([]);
  });
});
