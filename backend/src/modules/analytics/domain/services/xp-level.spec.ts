import { describe, it, expect } from 'vitest';
import { levelFromXp, xpFromSignals } from './xp-level';

describe('xpFromSignals', () => {
  it('weights dominated and streak above raw reviews, plus creation', () => {
    expect(xpFromSignals({ reviews: 10, dominated: 2, streak: 4, created: 5 })).toBe(
      10 + 100 + 20 + 15,
    );
  });

  it('is zero with no activity', () => {
    expect(xpFromSignals({ reviews: 0, dominated: 0, streak: 0, created: 0 })).toBe(0);
  });

  it('caps the creation contribution so a bulk-imported library cannot dominate', () => {
    const huge = xpFromSignals({ reviews: 0, dominated: 0, streak: 0, created: 100000 });
    expect(huge).toBe(1500);
  });
});

describe('levelFromXp', () => {
  it('starts at level 1 below the first threshold', () => {
    expect(levelFromXp(30)).toEqual({ xp: 30, level: 1, xpInLevel: 30, xpForNext: 100 });
  });

  it('advances a level every 100 xp', () => {
    expect(levelFromXp(250)).toEqual({ xp: 250, level: 3, xpInLevel: 50, xpForNext: 100 });
  });
});
