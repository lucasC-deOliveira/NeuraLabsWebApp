import { describe, it, expect } from 'vitest';
import { ListGraphsUseCase } from './list-graphs.use-case';
import type { GraphQuery, GraphSummary } from '../../domain/ports/graph-query';

const summary = (id: string): GraphSummary => ({
  id,
  nome: id,
  descricao: null,
  parentGrafoId: null,
  tipoRelacaoPai: null,
  filhosCount: 0,
  dataCriacao: new Date(0),
  dataAtualizacao: new Date(0),
});

class FakeGraphQuery implements GraphQuery {
  constructor(private readonly rows: GraphSummary[]) {}
  async listForUser(): Promise<GraphSummary[]> {
    return this.rows;
  }
  async findInfo(): Promise<null> {
    return null;
  }
}

describe('ListGraphsUseCase', () => {
  it('returns the graphs for the user', async () => {
    const useCase = new ListGraphsUseCase(new FakeGraphQuery([summary('g1'), summary('g2')]));
    const res = await useCase.execute('u1');
    expect(res.map((g) => g.id)).toEqual(['g1', 'g2']);
  });
});
