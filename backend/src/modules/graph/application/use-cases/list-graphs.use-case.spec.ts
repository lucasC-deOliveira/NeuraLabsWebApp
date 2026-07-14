import { describe, it, expect } from 'vitest';
import { ListGraphsUseCase } from './list-graphs.use-case';
import type {
  GraphQuery,
  GraphSummary,
  GraphListQuery,
  GraphListPage,
} from '../../domain/ports/graph-query';

const summary = (id: string): GraphSummary => ({
  id,
  nome: id,
  descricao: null,
  parentGrafoId: null,
  tipoRelacaoPai: null,
  filhosCount: 0,
  assuntos: [],
  dataCriacao: new Date(0),
  dataAtualizacao: new Date(0),
});

class FakeGraphQuery implements GraphQuery {
  lastQuery: GraphListQuery | null = null;
  constructor(private readonly rows: GraphSummary[]) {}
  async listForUser(_userId: string, query: GraphListQuery): Promise<GraphListPage> {
    this.lastQuery = query;
    return {
      items: this.rows,
      total: this.rows.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async findInfo(): Promise<null> {
    return null;
  }
  async listAssuntos(): Promise<[]> {
    return [];
  }
}

describe('ListGraphsUseCase', () => {
  it('returns the paginated page for the user', async () => {
    const useCase = new ListGraphsUseCase(new FakeGraphQuery([summary('g1'), summary('g2')]));
    const page = await useCase.execute('u1');
    expect(page.items.map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(page.total).toBe(2);
  });

  it('validates/normalizes the raw query before hitting the read model', async () => {
    const query = new FakeGraphQuery([]);
    await new ListGraphsUseCase(query).execute('u1', {
      tipo: 'raiz',
      sort: 'alfabetica',
      page: '3',
    });
    expect(query.lastQuery).toMatchObject({
      tipo: 'raiz',
      sort: 'alfabetica',
      page: 3,
      pageSize: 12,
    });
  });
});
