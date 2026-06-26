import { describe, it, expect } from 'vitest';
import { AssessCompletenessUseCase } from './assess-completeness.use-case';
import type { CompletenessRepository } from '../../domain/ports/completeness-repository';
import type { AssessmentContextData } from '../../domain/services/assessment-context';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeRepo implements CompletenessRepository {
  constructor(private readonly data: AssessmentContextData) {}
  async loadAssessmentData(): Promise<AssessmentContextData> {
    return this.data;
  }
}

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const empty: AssessmentContextData = {
  assuntos: [],
  topicos: [],
  conceitos: [],
  ncNodes: [],
  pertenceEdges: [],
};
const withSubject: AssessmentContextData = {
  ...empty,
  assuntos: [{ id: 'a1', nome: 'Bio' }],
  ncNodes: [{ id: 'na', tipoNode: 'ASSUNTO', referenciaId: 'a1' }],
};

describe('AssessCompletenessUseCase', () => {
  it('returns no assessments without subjects', async () => {
    const llm = new FakeLlm('{"assessments":[{"assuntoNome":"Bio","score":7}]}');
    const useCase = new AssessCompletenessUseCase(new FakeRepo(empty), llm);
    expect(await useCase.execute('u1', 'g1')).toEqual({ assessments: [] });
    expect(llm.lastRequest).toBeNull();
  });

  it('resolves and clamps the model assessments', async () => {
    const llm = new FakeLlm('{"assessments":[{"assuntoNome":"Bio","score":99,"missing":["X"]}]}');
    const useCase = new AssessCompletenessUseCase(new FakeRepo(withSubject), llm);
    const res = await useCase.execute('u1', 'g1');
    expect(res.assessments).toEqual([
      {
        assuntoId: 'a1',
        assuntoNome: 'Bio',
        score: 10,
        wellCovered: [],
        shallow: [],
        missing: ['X'],
      },
    ]);
  });

  it('returns no assessments when the model output is invalid JSON', async () => {
    const useCase = new AssessCompletenessUseCase(new FakeRepo(withSubject), new FakeLlm('nope'));
    expect(await useCase.execute('u1', 'g1')).toEqual({ assessments: [] });
  });
});
