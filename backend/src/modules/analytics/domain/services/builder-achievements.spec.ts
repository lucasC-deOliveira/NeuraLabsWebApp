import { describe, it, expect } from 'vitest';
import { evaluateBuilderAchievements } from './builder-achievements';

describe('evaluateBuilderAchievements', () => {
  it('earns a creation milestone once the total is reached', () => {
    const c10 = evaluateBuilderAchievements({
      created: 10,
      flashcardsCreated: 0,
      concepts: 0,
      subjects: 0,
    }).find((a) => a.id === 'created-10');
    expect(c10?.earned).toBe(true);
    expect(c10?.progress).toBe(1);
  });

  it('reports partial progress toward an explorer milestone', () => {
    const s15 = evaluateBuilderAchievements({
      created: 0,
      flashcardsCreated: 0,
      concepts: 0,
      subjects: 6,
    }).find((a) => a.id === 'subjects-15');
    expect(s15?.earned).toBe(false);
    expect(s15?.current).toBe(6);
    expect(s15?.progress).toBeCloseTo(6 / 15);
  });

  it('caps current at the target when the value exceeds it', () => {
    const c100 = evaluateBuilderAchievements({
      created: 0,
      flashcardsCreated: 0,
      concepts: 5000,
      subjects: 0,
    }).find((a) => a.id === 'concepts-100');
    expect(c100?.current).toBe(100);
    expect(c100?.progress).toBe(1);
  });
});
