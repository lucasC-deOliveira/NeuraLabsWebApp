import { describe, it, expect } from 'vitest';
import { buildDailyTarget, type DailyPool } from './daily-plan';

const pool = (over: Partial<DailyPool> = {}): DailyPool => ({
  dueReviews: 0,
  dueFeynman: 0,
  newAvailable: 100,
  secPerReview: 20,
  ...over,
});

describe('buildDailyTarget', () => {
  it('always keeps due reviews and Feynman as the backbone', () => {
    const t = buildDailyTarget(pool({ dueReviews: 32, dueFeynman: 2 }), {
      tipo: 'NOVOS',
      valor: 4,
    });
    expect(t.reviews).toBe(32);
    expect(t.feynman).toBe(2);
  });

  it('caps new cards by count in NOVOS mode', () => {
    const t = buildDailyTarget(pool({ newAvailable: 40 }), { tipo: 'NOVOS', valor: 5 });
    expect(t.novos).toBe(5);
  });

  it('never exceeds the available new cards', () => {
    const t = buildDailyTarget(pool({ newAvailable: 3 }), { tipo: 'NOVOS', valor: 10 });
    expect(t.novos).toBe(3);
  });

  it('fills the remaining time budget with new cards in TEMPO mode', () => {
    // 30 min = 1800s; backbone 20 reviews * 20s = 400s; sobram 1400s;
    // novo = 20 * 1.6 = 32s → floor(1400/32) = 43, mas só há 40 disponíveis.
    const t = buildDailyTarget(pool({ dueReviews: 20, newAvailable: 40 }), {
      tipo: 'TEMPO',
      valor: 30,
    });
    expect(t.novos).toBe(40);
    expect(t.note).toBeNull();
  });

  it('gives zero new and warns when the backlog eats the whole time budget', () => {
    // 10 min = 600s; backbone 40 reviews * 20s = 800s > 600 → 0 novos + aviso.
    const t = buildDailyTarget(pool({ dueReviews: 40, newAvailable: 50 }), {
      tipo: 'TEMPO',
      valor: 10,
    });
    expect(t.novos).toBe(0);
    expect(t.note).toContain('Backlog');
  });

  it('estimates the total minutes from the assembled pool', () => {
    // 10 reviews*20 + 2 feynman*180 + 5 novos*(20*1.6=32) = 200 + 360 + 160 = 720s = 12 min
    const t = buildDailyTarget(pool({ dueReviews: 10, dueFeynman: 2 }), {
      tipo: 'NOVOS',
      valor: 5,
    });
    expect(t.estMinutes).toBe(12);
  });
});
