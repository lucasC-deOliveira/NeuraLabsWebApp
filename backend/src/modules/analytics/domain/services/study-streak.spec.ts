import { describe, it, expect } from 'vitest';
import { studyStreak } from './study-streak';
import type { ReviewRow } from '../ports/flashcard-analytics-source';

const now = new Date('2026-07-22T12:00:00Z');
const review = (data: string): ReviewRow => ({
  data: new Date(data),
  acertou: true,
  nivelConfianca: 3,
  tempoResposta: 5000,
  tipoErro: null,
});

describe('studyStreak', () => {
  it('counts consecutive days ending today', () => {
    const out = studyStreak(
      [
        review('2026-07-22T09:00:00Z'),
        review('2026-07-21T09:00:00Z'),
        review('2026-07-20T09:00:00Z'),
      ],
      now,
    );
    expect(out.current).toBe(3);
  });

  it('breaks the streak on a gap', () => {
    const out = studyStreak([review('2026-07-22T09:00:00Z'), review('2026-07-19T09:00:00Z')], now);
    expect(out.current).toBe(1);
  });

  it('gives a one-day grace when today has no review yet', () => {
    const out = studyStreak([review('2026-07-21T09:00:00Z'), review('2026-07-20T09:00:00Z')], now);
    expect(out.current).toBe(2);
  });

  it('is zero when neither today nor yesterday has a review', () => {
    expect(studyStreak([review('2026-07-01T09:00:00Z')], now).current).toBe(0);
  });

  it('builds a per-day calendar sorted chronologically', () => {
    const out = studyStreak(
      [
        review('2026-07-21T09:00:00Z'),
        review('2026-07-21T22:00:00Z'),
        review('2026-07-20T09:00:00Z'),
      ],
      now,
    );
    expect(out.calendar).toEqual([
      { date: '2026-07-20', count: 1 },
      { date: '2026-07-21', count: 2 },
    ]);
  });
});
