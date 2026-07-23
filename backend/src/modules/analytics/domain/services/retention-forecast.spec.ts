import { describe, it, expect } from 'vitest';
import { retentionForecast } from './retention-forecast';
import type { LearningStateRow } from '../ports/flashcard-analytics-source';

const now = new Date('2026-07-22T12:00:00Z');
const state = (proximaRevisao: string): LearningStateRow => ({
  fase: 'REVIEW',
  intervalo: 10,
  proximaRevisao: new Date(proximaRevisao),
});

describe('retentionForecast', () => {
  it('returns a continuous series for `days` days', () => {
    const out = retentionForecast([], now, 7);
    expect(out).toHaveLength(7);
    expect(out[0].date).toBe('2026-07-22');
    expect(out.every((d) => d.count === 0)).toBe(true);
  });

  it('buckets cards on their due date', () => {
    const out = retentionForecast(
      [state('2026-07-24T09:00:00Z'), state('2026-07-24T20:00:00Z')],
      now,
      7,
    );
    expect(out.find((d) => d.date === '2026-07-24')?.count).toBe(2);
  });

  it('counts overdue cards on today', () => {
    const out = retentionForecast([state('2026-07-01T00:00:00Z')], now, 7);
    expect(out[0].count).toBe(1);
  });

  it('ignores cards due beyond the window', () => {
    const out = retentionForecast([state('2026-12-01T00:00:00Z')], now, 7);
    expect(out.reduce((sum, d) => sum + d.count, 0)).toBe(0);
  });
});
