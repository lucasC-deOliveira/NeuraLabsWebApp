import { describe, it, expect, beforeEach } from 'vitest';
import { RenameGraphUseCase } from './rename-graph.use-case';
import type { GraphRepository } from '../../domain/ports/graph-repository';

class FakeGraphRepository implements GraphRepository {
  readonly renamed: Array<{ userId: string; grafoId: string; name: string }> = [];
  async create(): Promise<{ id: string }> {
    return { id: 'g-1' };
  }
  async rename(userId: string, grafoId: string, name: string): Promise<void> {
    this.renamed.push({ userId, grafoId, name });
  }
}

describe('RenameGraphUseCase', () => {
  let repo: FakeGraphRepository;
  let useCase: RenameGraphUseCase;

  beforeEach(() => {
    repo = new FakeGraphRepository();
    useCase = new RenameGraphUseCase(repo);
  });

  it('renames the graph with the trimmed name', async () => {
    const res = await useCase.execute('u1', 'g1', '  Physics  ');
    expect(res).toEqual({ success: true });
    expect(repo.renamed).toEqual([{ userId: 'u1', grafoId: 'g1', name: 'Physics' }]);
  });
});
