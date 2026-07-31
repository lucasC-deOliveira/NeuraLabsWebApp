import { describe, it, expect } from 'vitest';
import { gamificationSummary } from './gamification-summary';
import type { ReviewRow } from '../ports/flashcard-analytics-source';

const review = (iso: string): ReviewRow => ({
  data: new Date(iso),
  acertou: true,
  nivelConfianca: 3,
  tempoResposta: null,
  tipoErro: null,
});

describe('gamificationSummary', () => {
  const now = new Date('2026-07-31T15:00:00Z');

  it('counts only today reviews for the daily goal, not the whole history', () => {
    const summary = gamificationSummary(
      [
        review('2026-07-31T09:00:00Z'),
        review('2026-07-31T14:00:00Z'),
        review('2026-07-30T10:00:00Z'),
      ],
      now,
    );

    expect(summary.reviewsToday).toBe(2);
  });

  it('carries the current streak from the shared streak service', () => {
    // Hoje, ontem e anteontem → streak 3.
    const summary = gamificationSummary(
      [
        review('2026-07-31T09:00:00Z'),
        review('2026-07-30T09:00:00Z'),
        review('2026-07-29T09:00:00Z'),
      ],
      now,
    );

    expect(summary.streak).toBe(3);
  });

  it('is all zeros when there is no history, never NaN or undefined', () => {
    expect(gamificationSummary([], now)).toEqual({ reviewsToday: 0, streak: 0 });
  });
});
