import { describe, it, expect } from 'vitest';
import { GenerateLearningPathUseCase } from './generate-learning-path.use-case';
import type {
  LearningGraph,
  LearningGraphRepository,
} from '../../domain/ports/learning-graph-repository';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeGraph implements LearningGraphRepository {
  constructor(private readonly graph: LearningGraph) {}
  async loadLearningGraph(): Promise<LearningGraph> {
    return this.graph;
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

const graph: LearningGraph = {
  nodes: [
    { id: 'c1', nome: 'Mitose', tipo: 'CONCEITO' },
    { id: 'c2', nome: 'Meiose', tipo: 'CONCEITO' },
  ],
  edges: [{ origem: 'c1', destino: 'c2', relacao: 'PREREQUISITO' }],
};

describe('GenerateLearningPathUseCase', () => {
  it('returns no steps for an empty graph', async () => {
    const llm = new FakeLlm('{"steps":[]}');
    const useCase = new GenerateLearningPathUseCase(new FakeGraph({ nodes: [], edges: [] }), llm);
    expect(await useCase.execute('u1', 'g1')).toEqual({ steps: [] });
    expect(llm.lastRequest).toBeNull();
  });

  it('resolves the model steps to graph nodes', async () => {
    const llm = new FakeLlm('{"steps":[{"nome":"Mitose","motivo":"base"}]}');
    const useCase = new GenerateLearningPathUseCase(new FakeGraph(graph), llm);
    const res = await useCase.execute('u1', 'g1');
    expect(res.steps).toEqual([{ nodeId: 'c1', nome: 'Mitose', tipo: 'CONCEITO', motivo: 'base' }]);
  });

  it('returns an empty path when the model output is invalid JSON', async () => {
    const useCase = new GenerateLearningPathUseCase(new FakeGraph(graph), new FakeLlm('not json'));
    expect(await useCase.execute('u1', 'g1')).toEqual({ steps: [] });
  });
});
