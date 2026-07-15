import { describe, it, expect } from 'vitest';
import { GenerateLearningPathUseCase } from './generate-learning-path.use-case';
import type {
  LearningGraph,
  LearningGraphRepository,
} from '../../domain/ports/learning-graph-repository';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';
import type { ConceitoImportanceSource } from '../../../curriculum/domain/ports/conceito-importance-source';
import type { ImportanceRow } from '../../../curriculum/domain/services/conceito-importance';

class FakeGraph implements LearningGraphRepository {
  constructor(private readonly graph: LearningGraph) {}
  async loadLearningGraph(): Promise<LearningGraph> {
    return this.graph;
  }
}

class FakeImportance implements ConceitoImportanceSource {
  constructor(private readonly rows: ImportanceRow[]) {}
  async load(): Promise<ImportanceRow[]> {
    return this.rows;
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

  it('re-ranks the path by importance while keeping prerequisites first', async () => {
    // c3 is the most tested (importance), but c1 is a prerequisite of c2.
    const g: LearningGraph = {
      nodes: [
        { id: 'c1', nome: 'C1', tipo: 'CONCEITO' },
        { id: 'c2', nome: 'C2', tipo: 'CONCEITO' },
        { id: 'c3', nome: 'C3', tipo: 'CONCEITO' },
      ],
      edges: [{ origem: 'c1', destino: 'c2', relacao: 'PREREQUISITO' }],
    };
    const llm = new FakeLlm('{"steps":[{"nome":"C1"},{"nome":"C2"},{"nome":"C3"}]}');
    const importance = new FakeImportance([
      { conceitoId: 'c1', nome: 'C1', topicoId: 't', provaFreq: 0 },
      { conceitoId: 'c2', nome: 'C2', topicoId: 't', provaFreq: 0 },
      { conceitoId: 'c3', nome: 'C3', topicoId: 't', provaFreq: 9 },
    ]);
    const useCase = new GenerateLearningPathUseCase(new FakeGraph(g), llm, importance);
    const order = (await useCase.execute('u1', 'g1')).steps.map((s) => s.nodeId);
    expect(order[0]).toBe('c3'); // most important, no prereq → first
    expect(order.indexOf('c1')).toBeLessThan(order.indexOf('c2')); // prereq kept
  });
});
