import { describe, it, expect } from 'vitest';
import { evaluateAchievements } from './achievements';

describe('evaluateAchievements', () => {
  it('marks a streak milestone earned once the target is reached', () => {
    const s7 = evaluateAchievements({ streak: 7, reviews: 0, dominated: 0 }).find(
      (a) => a.id === 'streak-7',
    );
    expect(s7?.earned).toBe(true);
    expect(s7?.progress).toBe(1);
  });

  it('reports partial progress and caps current at the target', () => {
    const s7 = evaluateAchievements({ streak: 4, reviews: 0, dominated: 0 }).find(
      (a) => a.id === 'streak-7',
    );
    expect(s7?.earned).toBe(false);
    expect(s7?.current).toBe(4);
    expect(s7?.progress).toBeCloseTo(4 / 7);
  });

  it('caps progress at 1 when the value exceeds the target', () => {
    const r100 = evaluateAchievements({ streak: 0, reviews: 500, dominated: 0 }).find(
      (a) => a.id === 'reviews-100',
    );
    expect(r100?.progress).toBe(1);
    expect(r100?.current).toBe(100);
  });

  it('keeps domain milestones dormant with no dominated concepts', () => {
    const earned = evaluateAchievements({ streak: 0, reviews: 0, dominated: 0 }).filter(
      (a) => a.id.startsWith('dominated-') && a.earned,
    );
    expect(earned).toHaveLength(0);
  });
});
