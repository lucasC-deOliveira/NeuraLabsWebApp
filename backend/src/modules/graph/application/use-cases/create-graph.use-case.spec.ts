import { describe, it, expect, beforeEach } from 'vitest';
import { CreateGraphUseCase, MASTER_GRAPH_NAME } from './create-graph.use-case';
import type { GraphRepository } from '../../domain/ports/graph-repository';
import type {
  CreateSubgraphInput,
  CreateSubgraphRepository,
} from '../../domain/ports/create-subgraph-repository';
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

class FakeGraphRepository implements GraphRepository {
  readonly created: Array<{ name: string; descricao: string | null }> = [];
  rootId: string | null = null;

  async create(_userId: string, name: string, descricao: string | null): Promise<{ id: string }> {
    this.created.push({ name, descricao });
    const id = `root-${this.created.length}`;
    this.rootId = id;
    return { id };
  }
  async rename(): Promise<void> {}
  async findRootId(): Promise<string | null> {
    return this.rootId;
  }
}

class FakeSubgraphRepository implements CreateSubgraphRepository {
  readonly subgraphs: Array<{ parent: string; input: CreateSubgraphInput }> = [];
  async parentExists(): Promise<boolean> {
    return true;
  }
  async createSubgraph(
    _userId: string,
    parentGrafoId: string,
    input: CreateSubgraphInput,
  ): Promise<{ grafoId: string; grafoRefNodeId: string }> {
    this.subgraphs.push({ parent: parentGrafoId, input });
    const id = `sub-${this.subgraphs.length}`;
    return { grafoId: id, grafoRefNodeId: id };
  }
}

// "Criar grafo" cria um SUBGRAFO do master — o app tem um grafo só. Antes este
// use-case criava um raiz solto.
describe('CreateGraphUseCase', () => {
  let graphs: FakeGraphRepository;
  let subgraphs: FakeSubgraphRepository;
  let cache: FakeCache;
  let useCase: CreateGraphUseCase;

  beforeEach(() => {
    graphs = new FakeGraphRepository();
    subgraphs = new FakeSubgraphRepository();
    cache = new FakeCache();
    useCase = new CreateGraphUseCase(graphs, subgraphs, cache);
  });

  // Primeiro grafo do usuário: o master ainda não existe, então é criado antes.
  it('creates the master lazily and hangs the new graph under it', async () => {
    const res = await useCase.execute('u1', 'Cálculo');

    expect(graphs.created).toEqual([{ name: MASTER_GRAPH_NAME, descricao: null }]);
    expect(subgraphs.subgraphs).toHaveLength(1);
    expect(subgraphs.subgraphs[0].parent).toBe('root-1');
    expect(subgraphs.subgraphs[0].input.nome).toBe('Cálculo');
    expect(res).toEqual({ id: 'sub-1' });
  });

  // Master já existe: não cria outro raiz, só pendura o novo subgrafo nele.
  it('reuses the existing master instead of creating a second root', async () => {
    graphs.rootId = 'master-existente';

    await useCase.execute('u1', 'Física');

    expect(graphs.created).toHaveLength(0);
    expect(subgraphs.subgraphs[0].parent).toBe('master-existente');
  });

  it('trims the name and defaults a blank one to "Novo grafo"', async () => {
    await useCase.execute('u1', '  Biologia  ');
    expect(subgraphs.subgraphs[0].input.nome).toBe('Biologia');

    await useCase.execute('u1', '   ');
    expect(subgraphs.subgraphs[1].input.nome).toBe('Novo grafo');
  });

  it('creates only one master across several graphs', async () => {
    await useCase.execute('u1', 'A');
    await useCase.execute('u1', 'B');
    await useCase.execute('u1', 'C');
    expect(graphs.created).toHaveLength(1);
    expect(subgraphs.subgraphs.map((s) => s.parent)).toEqual(['root-1', 'root-1', 'root-1']);
  });

  // A lista de grafos do usuário fica stale ao criar um — invalida a tag dele.
  it("invalidates the user's graph-list cache", async () => {
    await useCase.execute('u1', 'Cálculo');
    expect(cache.invalidated).toContain('user:u1');
  });
});
