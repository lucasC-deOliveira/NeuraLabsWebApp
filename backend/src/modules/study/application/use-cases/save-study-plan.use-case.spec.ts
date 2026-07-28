import { describe, it, expect } from 'vitest';
import { SaveStudyPlanUseCase } from './save-study-plan.use-case';
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
  grafoId: 'g1',
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
    const plan = await new SaveStudyPlanUseCase(plans).execute('u1', valid);
    expect(plan.id).toBe('p1');
    expect(plans.saved?.metaValor).toBe(5);
  });

  it('accepts a scoped priority key (prova|p:<id>)', async () => {
    const plans = new FakePlans();
    await new SaveStudyPlanUseCase(plans).execute('u1', { ...valid, prioridade: 'prova|p:abc' });
    expect(plans.saved?.prioridade).toBe('prova|p:abc');
  });

  it('rejects a non-positive daily goal', async () => {
    await expect(
      new SaveStudyPlanUseCase(new FakePlans()).execute('u1', { ...valid, metaValor: 0 }),
    ).rejects.toThrow(/metaValor/);
  });

  it('rejects an unknown priority', async () => {
    await expect(
      new SaveStudyPlanUseCase(new FakePlans()).execute('u1', { ...valid, prioridade: 'xpto' }),
    ).rejects.toThrow(/prioridade/);
  });
});
