import { describe, it, expect, beforeEach } from 'vitest';
import { RenameGraphUseCase } from './rename-graph.use-case';
import type { GraphRepository } from '../../domain/ports/graph-repository';
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
  readonly renamed: Array<{ userId: string; grafoId: string; name: string }> = [];
  async create(): Promise<{ id: string }> {
    return { id: 'g-1' };
  }
  async rename(userId: string, grafoId: string, name: string): Promise<void> {
    this.renamed.push({ userId, grafoId, name });
  }
  async findRootId(): Promise<string | null> {
    return null;
  }
}

describe('RenameGraphUseCase', () => {
  let repo: FakeGraphRepository;
  let cache: FakeCache;
  let useCase: RenameGraphUseCase;

  beforeEach(() => {
    repo = new FakeGraphRepository();
    cache = new FakeCache();
    useCase = new RenameGraphUseCase(repo, cache);
  });

  it('renames the graph with the trimmed name', async () => {
    const res = await useCase.execute('u1', 'g1', '  Physics  ');
    expect(res).toEqual({ success: true });
    expect(repo.renamed).toEqual([{ userId: 'u1', grafoId: 'g1', name: 'Physics' }]);
  });

  // O nome exibido na lista mudou → invalida a listagem cacheada do usuário.
  it("invalidates the user's graph-list cache", async () => {
    await useCase.execute('u1', 'g1', 'Physics');
    expect(cache.invalidated).toContain('user:u1');
  });
});
