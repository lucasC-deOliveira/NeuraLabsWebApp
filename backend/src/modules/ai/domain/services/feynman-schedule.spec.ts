import { describe, it, expect } from 'vitest';
import { nextFeynmanReview } from './feynman-schedule';

const now = new Date('2026-01-01T00:00:00.000Z');
const daysBetween = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 86_400_000);

describe('nextFeynmanReview', () => {
  it('sends a poor explanation back the next day', () => {
    const s = nextFeynmanReview(20, 10, now);
    expect(s.intervalo).toBe(1);
    expect(daysBetween(now, s.proximaRevisao)).toBe(1);
  });

  it('spaces a clear explanation a lot', () => {
    expect(nextFeynmanReview(85, 0, now).intervalo).toBe(7);
    expect(nextFeynmanReview(85, 10, now).intervalo).toBe(22);
  });

  it('grows medium clarity slowly and caps the interval', () => {
    expect(nextFeynmanReview(55, 0, now).intervalo).toBe(3);
    expect(nextFeynmanReview(90, 100, now).intervalo).toBe(180);
  });
});
