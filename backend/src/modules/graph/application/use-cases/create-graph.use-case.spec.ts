import { describe, it, expect, beforeEach } from 'vitest';
import { CreateGraphUseCase } from './create-graph.use-case';
import type { GraphRepository } from '../../domain/ports/graph-repository';

class FakeGraphRepository implements GraphRepository {
  readonly created: Array<{ userId: string; name: string; descricao: string | null }> = [];
  readonly renamed: Array<{ userId: string; grafoId: string; name: string }> = [];
  async create(userId: string, name: string, descricao: string | null): Promise<{ id: string }> {
    this.created.push({ userId, name, descricao });
    return { id: `g-${this.created.length}` };
  }
  async rename(userId: string, grafoId: string, name: string): Promise<void> {
    this.renamed.push({ userId, grafoId, name });
  }
}

describe('CreateGraphUseCase', () => {
  let repo: FakeGraphRepository;
  let useCase: CreateGraphUseCase;

  beforeEach(() => {
    repo = new FakeGraphRepository();
    useCase = new CreateGraphUseCase(repo);
  });

  it('creates a graph with the trimmed name', async () => {
    const res = await useCase.execute('u1', '  Biology  ', 'my desc');
    expect(res).toEqual({ id: 'g-1' });
    expect(repo.created).toEqual([{ userId: 'u1', name: 'Biology', descricao: 'my desc' }]);
  });

  it('defaults a blank name to "Novo grafo"', async () => {
    await useCase.execute('u1', '   ');
    expect(repo.created[0]?.name).toBe('Novo grafo');
  });

  it('passes a null description when none is given', async () => {
    await useCase.execute('u1', 'Chemistry');
    expect(repo.created[0]?.descricao).toBeNull();
  });
});
