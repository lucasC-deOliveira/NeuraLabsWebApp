import { describe, it, expect } from 'vitest';
import { buildAchievements, type AchievementDef } from './achievement-eval';

const defs: AchievementDef<'x'>[] = [
  { id: 'x-10', title: 'Ten', description: 'reach 10', metric: 'x', target: 10 },
];

describe('buildAchievements', () => {
  it('earns when the signal reaches the target', () => {
    expect(buildAchievements(defs, { x: 10 })[0]).toMatchObject({ earned: true, progress: 1 });
  });

  it('reports fractional progress and caps current below target', () => {
    const a = buildAchievements(defs, { x: 4 })[0];
    expect(a.earned).toBe(false);
    expect(a.current).toBe(4);
    expect(a.progress).toBeCloseTo(0.4);
  });
});
