import { describe, it, expect } from 'vitest';
import { ListGraphsUseCase } from './list-graphs.use-case';
import type {
  GraphQuery,
  GraphSummary,
  GraphListQuery,
  GraphListPage,
} from '../../domain/ports/graph-query';
import type { CachePort } from '../../../cache/domain/cache-port';

// Cache que memoiza por chave — o bastante para provar o cache-aside sem a infra
// (arch: application não importa infrastructure).
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
  calls = 0;
  constructor(private readonly rows: GraphSummary[]) {}
  async listForUser(_userId: string, query: GraphListQuery): Promise<GraphListPage> {
    this.calls++;
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
    const useCase = new ListGraphsUseCase(
      new FakeGraphQuery([summary('g1'), summary('g2')]),
      new FakeCache(),
    );
    const page = await useCase.execute('u1');
    expect(page.items.map((g) => g.id)).toEqual(['g1', 'g2']);
    expect(page.total).toBe(2);
  });

  it('validates/normalizes the raw query before hitting the read model', async () => {
    const query = new FakeGraphQuery([]);
    await new ListGraphsUseCase(query, new FakeCache()).execute('u1', {
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

  it('caches the read model: same query hits the store once', async () => {
    const query = new FakeGraphQuery([summary('g1')]);
    const useCase = new ListGraphsUseCase(query, new FakeCache());
    await useCase.execute('u1', { tipo: 'raiz' });
    await useCase.execute('u1', { tipo: 'raiz' });
    expect(query.calls).toBe(1);
  });

  it('keys by the normalized query: different filters do not collide', async () => {
    const query = new FakeGraphQuery([summary('g1')]);
    const useCase = new ListGraphsUseCase(query, new FakeCache());
    await useCase.execute('u1', { tipo: 'raiz' });
    await useCase.execute('u1', { tipo: 'subgrafo' });
    expect(query.calls).toBe(2);
  });
});
