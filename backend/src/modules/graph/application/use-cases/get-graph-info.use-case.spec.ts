import { describe, it, expect } from 'vitest';
import { GetGraphInfoUseCase } from './get-graph-info.use-case';
import type { GraphInfoView, GraphQuery, GraphSummary } from '../../domain/ports/graph-query';

const info: GraphInfoView = {
  nome: 'Biology',
  parentGrafoId: null,
  parentNome: null,
  tipoRelacaoPai: null,
  filhosCount: 0,
};

class FakeGraphQuery implements GraphQuery {
  constructor(private readonly found: GraphInfoView | null) {}
  async listForUser(): Promise<GraphSummary[]> {
    return [];
  }
  async findInfo(): Promise<GraphInfoView | null> {
    return this.found;
  }
}

describe('GetGraphInfoUseCase', () => {
  it('returns the info view when the graph is owned', async () => {
    const useCase = new GetGraphInfoUseCase(new FakeGraphQuery(info));
    expect(await useCase.execute('u1', 'g1')).toEqual(info);
  });

  it('returns null when the graph is not found', async () => {
    const useCase = new GetGraphInfoUseCase(new FakeGraphQuery(null));
    expect(await useCase.execute('u1', 'missing')).toBeNull();
  });
});
