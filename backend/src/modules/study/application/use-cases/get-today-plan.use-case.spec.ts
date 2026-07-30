import { describe, it, expect } from 'vitest';
import { GetTodayPlanUseCase } from './get-today-plan.use-case';
import type { StudyPlan, StudyPlanRepository } from '../../domain/ports/study-plan-repository';
import type { PlanContext, PlanContextQuery } from '../../domain/ports/plan-context-query';
import type { RoadmapNewCardsQuery } from '../../domain/ports/roadmap-new-cards-query';
import type { StudyCardView } from '../../domain/ports/study-card-query';
import type { Clock } from '../../domain/ports/clock';
import type { CachePort } from '../../../cache/domain/cache-port';

// Fake que cacheia por chave (Map) — o bastante para verificar o cache-aside sem
// depender da infra (arch: application não importa infrastructure).
class FakeCache implements CachePort {
  private readonly store = new Map<string, unknown>();
  async getOrCompute<T>(key: string, _t: number, compute: () => Promise<T>): Promise<T> {
    if (this.store.has(key)) return this.store.get(key) as T;
    const value = await compute();
    this.store.set(key, value);
    return value;
  }
  get<T>(key: string): Promise<T | null> {
    return Promise.resolve((this.store.get(key) as T) ?? null);
  }
  set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }
  del(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
  delByTag(): Promise<void> {
    return Promise.resolve();
  }
}

const PLAN: StudyPlan = {
  id: 'p1',
  grafoIds: ['g1'],
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
  public calls = 0;
  constructor(private readonly ctx: PlanContext) {}
  load(): Promise<PlanContext> {
    this.calls++;
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
      new FakeCache(),
    );
    expect(await useCase.execute('u1', 'g1')).toBeNull();
  });

  it('builds today target (reviews + feynman backbone + new capped by the goal)', async () => {
    const useCase = new GetTodayPlanUseCase(
      new FakePlans(PLAN),
      new FakeContext(ctx),
      new FakeNewCards(10),
      clock,
      new FakeCache(),
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
      new FakeCache(),
    );
    const today = await useCase.execute('u1', 'g1');
    expect(today?.target.novos).toBe(2);
  });

  it('caches the result: two executes compute only once', async () => {
    const context = new FakeContext(ctx);
    const useCase = new GetTodayPlanUseCase(
      new FakePlans(PLAN),
      context,
      new FakeNewCards(10),
      clock,
      new FakeCache(),
    );
    await useCase.execute('u1', 'p1');
    await useCase.execute('u1', 'p1');
    expect(context.calls).toBe(1);
  });

  it('projects the completion from the pace', async () => {
    const useCase = new GetTodayPlanUseCase(
      new FakePlans(PLAN),
      new FakeContext(ctx),
      new FakeNewCards(10),
      clock,
      new FakeCache(),
    );
    const today = await useCase.execute('u1', 'g1');
    expect(today?.projection.daysNeeded).toBe(17); // ceil(68/4)
  });
});
