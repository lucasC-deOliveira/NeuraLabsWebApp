import { describe, it, expect } from 'vitest';
import { nearestDeadline } from './plan-deadline';
import type { StudyPlan } from '../ports/study-plan-repository';

const NOW = new Date('2026-08-10T12:00:00.000Z');
const dias = (n: number): Date => new Date(NOW.getTime() + n * 86_400_000);

const plan = (over: Partial<StudyPlan>): StudyPlan => ({
  id: 'p1',
  prioridade: 'prova',
  metaTipo: 'NOVOS',
  metaValor: 5,
  dataAlvo: null,
  ativo: true,
  grafoIds: [],
  baralhoIds: [],
  provaIds: [],
  conceitosExcluidos: [],
  ...over,
});

describe('nearestDeadline', () => {
  it('returns null when there is no plan at all', () => {
    expect(nearestDeadline([], NOW)).toBeNull();
  });

  it('returns null when no plan carries a deadline', () => {
    expect(nearestDeadline([plan({ dataAlvo: null })], NOW)).toBeNull();
  });

  it('picks the closest upcoming deadline among several plans', () => {
    const plans = [
      plan({ id: 'a', dataAlvo: dias(60) }),
      plan({ id: 'b', dataAlvo: dias(14) }),
      plan({ id: 'c', dataAlvo: dias(30) }),
    ];
    expect(nearestDeadline(plans, NOW)).toEqual(dias(14));
  });

  // A finished exam must not keep squeezing the schedule forever.
  it('ignores deadlines that already passed', () => {
    const plans = [plan({ id: 'a', dataAlvo: dias(-1) }), plan({ id: 'b', dataAlvo: dias(20) })];
    expect(nearestDeadline(plans, NOW)).toEqual(dias(20));
  });

  it('returns null when every deadline is in the past', () => {
    expect(nearestDeadline([plan({ dataAlvo: dias(-5) })], NOW)).toBeNull();
  });

  it('ignores inactive plans', () => {
    const plans = [
      plan({ id: 'a', dataAlvo: dias(3), ativo: false }),
      plan({ id: 'b', dataAlvo: dias(40) }),
    ];
    expect(nearestDeadline(plans, NOW)).toEqual(dias(40));
  });

  // Exactly "now" is not ahead: it would divide by a zero-day window.
  it('treats a deadline exactly at now as past', () => {
    expect(nearestDeadline([plan({ dataAlvo: NOW })], NOW)).toBeNull();
  });
});
