import { describe, it, expect } from 'vitest';
import { GetEdgesUseCase } from './get-edges.use-case';
import type { GraphEdgesQuery, GraphEdgeView } from '../../domain/ports/graph-edges-query';

const edge: GraphEdgeView = {
  id: 'e1',
  source: 's',
  target: 't',
  tipoRelacao: 'DEFINE',
  peso: 1,
  sourceLabel: 'Source',
  targetLabel: 'Target',
};

class FakeGraphEdgesQuery implements GraphEdgesQuery {
  constructor(private readonly rows: GraphEdgeView[]) {}
  async listForGraph(): Promise<GraphEdgeView[]> {
    return this.rows;
  }
}

describe('GetEdgesUseCase', () => {
  it('returns the labeled edges of the graph', async () => {
    const useCase = new GetEdgesUseCase(new FakeGraphEdgesQuery([edge]));
    expect(await useCase.execute('u1', 'g1')).toEqual([edge]);
  });
});
