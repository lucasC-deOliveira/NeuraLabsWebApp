import { describe, it, expect } from 'vitest';
import { projectCompletion } from './plan-projection';

const TODAY = new Date('2026-07-27T00:00:00Z');

describe('projectCompletion', () => {
  it('projects a finish date from the current pace', () => {
    const p = projectCompletion({ remainingConcepts: 68, avgNewPerDay: 4, today: TODAY });
    expect(p.daysNeeded).toBe(17); // ceil(68/4)
    expect(p.projectedFinish?.toISOString().slice(0, 10)).toBe('2026-08-13');
  });

  it('marks on-track when the projection lands before the target date', () => {
    const dataAlvo = new Date('2026-09-24T00:00:00Z');
    const p = projectCompletion({ remainingConcepts: 68, avgNewPerDay: 4, today: TODAY, dataAlvo });
    expect(p.onTrack).toBe(true);
    expect(p.suggestedPerDay).toBe(2); // ceil(68/59 dias)
  });

  it('marks off-track and suggests a faster pace to hit the date', () => {
    const dataAlvo = new Date('2026-08-06T00:00:00Z'); // 10 dias
    const p = projectCompletion({ remainingConcepts: 68, avgNewPerDay: 4, today: TODAY, dataAlvo });
    expect(p.onTrack).toBe(false);
    expect(p.suggestedPerDay).toBe(7); // ceil(68/10)
  });

  it('reports unknown pace when nothing new is being done', () => {
    const p = projectCompletion({ remainingConcepts: 68, avgNewPerDay: 0, today: TODAY });
    expect(p.projectedFinish).toBeNull();
    expect(p.onTrack).toBeNull();
  });

  it('is complete when there are no concepts left', () => {
    const p = projectCompletion({ remainingConcepts: 0, avgNewPerDay: 4, today: TODAY });
    expect(p.daysNeeded).toBe(0);
    expect(p.onTrack).toBe(true);
  });
});
