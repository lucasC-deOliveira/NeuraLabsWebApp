import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteGraphUseCase } from './delete-graph.use-case';
import { GraphNotFoundError } from '../../domain/errors';
import type { GraphDeletionRepository } from '../../domain/ports/graph-deletion-repository';
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

class FakeGraphDeletionRepository implements GraphDeletionRepository {
  readonly graphs = new Set<string>();
  readonly deletados: string[] = [];

  async graphExists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async deleteGraph(grafoId: string): Promise<void> {
    this.deletados.push(grafoId);
  }
}

// Apagar um grafo apaga a VISTA. Este spec era três vezes maior: montava membros,
// refs compartilhadas e um plano ordenado de deleção de entidades, porque o grafo
// levava o conteúdo junto. Com o nó do sistema, sobrou o que a operação de fato é.
describe('DeleteGraphUseCase', () => {
  let repo: FakeGraphDeletionRepository;
  let cache: FakeCache;
  let useCase: DeleteGraphUseCase;

  beforeEach(() => {
    repo = new FakeGraphDeletionRepository();
    repo.graphs.add('g1');
    cache = new FakeCache();
    useCase = new DeleteGraphUseCase(repo, cache);
  });

  it('deletes the graph the user owns', async () => {
    expect(await useCase.execute('u1', 'g1')).toEqual({ success: true });
    expect(repo.deletados).toEqual(['g1']);
  });

  it('refuses a graph that does not exist, instead of deleting nothing quietly', async () => {
    await expect(useCase.execute('u1', 'inexistente')).rejects.toThrow(GraphNotFoundError);
    expect(repo.deletados).toEqual([]);
  });

  // A lista de grafos do usuário fica stale ao apagar um — invalida a tag dele.
  it("invalidates the user's graph-list cache on delete", async () => {
    await useCase.execute('u1', 'g1');
    expect(cache.invalidated).toContain('user:u1');
  });

  // Grafo inexistente não muda nada → nada a invalidar.
  it('does not invalidate when the graph does not exist', async () => {
    await expect(useCase.execute('u1', 'inexistente')).rejects.toThrow(GraphNotFoundError);
    expect(cache.invalidated).toEqual([]);
  });
});
