import { describe, it, expect } from 'vitest';
import { GetTodayPlanUseCase } from './get-today-plan.use-case';
import type { StudyPlan, StudyPlanRepository } from '../../domain/ports/study-plan-repository';
import type { PlanContext, PlanContextQuery } from '../../domain/ports/plan-context-query';
import type { RoadmapNewCardsQuery } from '../../domain/ports/roadmap-new-cards-query';
import type { StudyCardView } from '../../domain/ports/study-card-query';
import type { Clock } from '../../domain/ports/clock';

const PLAN: StudyPlan = {
  id: 'p1',
  grafoId: 'g1',
  prioridade: 'prova',
  metaTipo: 'NOVOS',
  metaValor: 4,
  dataAlvo: null,
  ativo: true,
  baralhoIds: [],
  provaIds: [],
  conceitosExcluidos: [],
};

class FakePlans implements StudyPlanRepository {
  constructor(private readonly plan: StudyPlan | null) {}
  loadById(): Promise<StudyPlan | null> {
    return Promise.resolve(this.plan);
  }
  load(): Promise<StudyPlan | null> {
    return Promise.resolve(this.plan);
  }
  save(): Promise<StudyPlan> {
    return Promise.resolve(PLAN);
  }
  listByUser(): Promise<StudyPlan[]> {
    return Promise.resolve([]);
  }
  deleteById(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeContext implements PlanContextQuery {
  constructor(private readonly ctx: PlanContext) {}
  load(): Promise<PlanContext> {
    return Promise.resolve(this.ctx);
  }
}

class FakeNewCards implements RoadmapNewCardsQuery {
  constructor(private readonly count: number) {}
  findByRoadmap(): Promise<StudyCardView[]> {
    const card = {} as StudyCardView;
    return Promise.resolve(Array.from({ length: this.count }, () => card));
  }
}

const clock: Clock = { now: () => new Date('2026-07-27T00:00:00Z') };
const ctx: PlanContext = {
  dueReviews: 32,
  dueFeynman: 2,
  avgSecondsPerCard: 20,
  remainingConcepts: 68,
};

describe('GetTodayPlanUseCase', () => {
  it('returns null when the graph has no plan', async () => {
    const useCase = new GetTodayPlanUseCase(
      new FakePlans(null),
      new FakeContext(ctx),
      new FakeNewCards(10),
      clock,
    );
    expect(await useCase.execute('u1', 'g1')).toBeNull();
  });

  it('builds today target (reviews + feynman backbone + new capped by the goal)', async () => {
    const useCase = new GetTodayPlanUseCase(
      new FakePlans(PLAN),
      new FakeContext(ctx),
      new FakeNewCards(10),
      clock,
    );
    const today = await useCase.execute('u1', 'g1');
    expect(today?.target.reviews).toBe(32);
    expect(today?.target.feynman).toBe(2);
    expect(today?.target.novos).toBe(4); // meta NOVOS=4, 10 disponíveis
    expect(today?.newAvailable).toBe(10);
  });

  it('caps new by availability when fewer are left than the goal', async () => {
    const useCase = new GetTodayPlanUseCase(
      new FakePlans(PLAN),
      new FakeContext(ctx),
      new FakeNewCards(2),
      clock,
    );
    const today = await useCase.execute('u1', 'g1');
    expect(today?.target.novos).toBe(2);
  });

  it('projects the completion from the pace', async () => {
    const useCase = new GetTodayPlanUseCase(
      new FakePlans(PLAN),
      new FakeContext(ctx),
      new FakeNewCards(10),
      clock,
    );
    const today = await useCase.execute('u1', 'g1');
    expect(today?.projection.daysNeeded).toBe(17); // ceil(68/4)
  });
});
