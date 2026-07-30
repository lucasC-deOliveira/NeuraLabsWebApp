import { describe, it, expect } from 'vitest';
import { SaveStudyPlanUseCase } from './save-study-plan.use-case';
import type { CachePort } from '../../../cache/domain/cache-port';

// Cache pass-through que registra as invalidações (delByTag).
class FakeCache implements CachePort {
  public invalidated: string[] = [];
  getOrCompute<T>(_k: string, _t: number, compute: () => Promise<T>): Promise<T> {
    return compute();
  }
  get<T>(): Promise<T | null> {
    return Promise.resolve(null);
  }
  set(): Promise<void> {
    return Promise.resolve();
  }
  del(): Promise<void> {
    return Promise.resolve();
  }
  delByTag(tag: string): Promise<void> {
    this.invalidated.push(tag);
    return Promise.resolve();
  }
}
import type {
  StudyPlan,
  StudyPlanInput,
  StudyPlanRepository,
} from '../../domain/ports/study-plan-repository';

class FakePlans implements StudyPlanRepository {
  public saved: StudyPlanInput | null = null;
  loadById(): Promise<StudyPlan | null> {
    return Promise.resolve(null);
  }
  load(): Promise<StudyPlan | null> {
    return Promise.resolve(null);
  }
  listByUser(): Promise<StudyPlan[]> {
    return Promise.resolve([]);
  }
  save(_userId: string, input: StudyPlanInput): Promise<StudyPlan> {
    this.saved = input;
    return Promise.resolve({ id: 'p1', ativo: true, ...input });
  }
  deleteById(): Promise<void> {
    return Promise.resolve();
  }
}

const valid: StudyPlanInput = {
  grafoIds: ['g1'],
  prioridade: 'prova',
  metaTipo: 'NOVOS',
  metaValor: 5,
  dataAlvo: null,
  baralhoIds: [],
  provaIds: [],
  conceitosExcluidos: [],
};

describe('SaveStudyPlanUseCase', () => {
  it('saves a valid plan', async () => {
    const plans = new FakePlans();
    const plan = await new SaveStudyPlanUseCase(plans, new FakeCache()).execute('u1', valid);
    expect(plan.id).toBe('p1');
    expect(plans.saved?.metaValor).toBe(5);
  });

  // O grafo virou conteúdo (multi): não é mais obrigatório e passa direto ao repo.
  it('accepts graphs as content and no longer requires a graph', async () => {
    const plans = new FakePlans();
    await new SaveStudyPlanUseCase(plans, new FakeCache()).execute('u1', {
      ...valid,
      grafoIds: ['g1', 'g2'],
    });
    expect(plans.saved?.grafoIds).toEqual(['g1', 'g2']);
  });

  it('accepts a scoped priority key (prova|p:<id>)', async () => {
    const plans = new FakePlans();
    await new SaveStudyPlanUseCase(plans, new FakeCache()).execute('u1', {
      ...valid,
      prioridade: 'prova|p:abc',
    });
    expect(plans.saved?.prioridade).toBe('prova|p:abc');
  });

  it('rejects a non-positive daily goal', async () => {
    await expect(
      new SaveStudyPlanUseCase(new FakePlans(), new FakeCache()).execute('u1', {
        ...valid,
        metaValor: 0,
      }),
    ).rejects.toThrow(/metaValor/);
  });

  it('rejects an unknown priority', async () => {
    await expect(
      new SaveStudyPlanUseCase(new FakePlans(), new FakeCache()).execute('u1', {
        ...valid,
        prioridade: 'xpto',
      }),
    ).rejects.toThrow(/prioridade/);
  });

  it("invalidates the saved plan's today cache", async () => {
    const cache = new FakeCache();
    const plan = await new SaveStudyPlanUseCase(new FakePlans(), cache).execute('u1', valid);
    expect(cache.invalidated).toContain(`plan:${plan.id}`);
  });
});
