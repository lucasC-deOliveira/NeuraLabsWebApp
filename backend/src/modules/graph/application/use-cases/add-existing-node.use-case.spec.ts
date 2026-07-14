import { describe, it, expect, beforeEach } from 'vitest';
import { AddExistingNodeUseCase } from './add-existing-node.use-case';
import { GraphNotFoundError } from '../../domain/errors';
import type { GraphNodeRepository } from '../../domain/ports/graph-node-repository';

class FakeGraphNodeRepository implements GraphNodeRepository {
  readonly graphs = new Set<string>();
  readonly added: Array<{ grafoId: string; tipoNode: string; entityId: string }> = [];
  async graphExists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async addNodeLink(
    grafoId: string,
    _u: string,
    tipoNode: string,
    entityId: string,
  ): Promise<void> {
    this.added.push({ grafoId, tipoNode, entityId });
  }
  async findNodeInGraph(): Promise<{ id: string } | null> {
    return null;
  }
  async removeNodeLink(): Promise<void> {}
}

describe('AddExistingNodeUseCase', () => {
  let repo: FakeGraphNodeRepository;
  let useCase: AddExistingNodeUseCase;

  beforeEach(() => {
    repo = new FakeGraphNodeRepository();
    repo.graphs.add('g1');
    useCase = new AddExistingNodeUseCase(repo);
  });

  it('links an entity into the graph', async () => {
    const res = await useCase.execute('u1', 'g1', 'CONCEITO', 'c-1');
    expect(res).toEqual({ success: true, nodeId: 'c-1' });
    expect(repo.added).toEqual([{ grafoId: 'g1', tipoNode: 'CONCEITO', entityId: 'c-1' }]);
  });

  it('throws when the graph does not exist', async () => {
    await expect(useCase.execute('u1', 'missing', 'CONCEITO', 'c-1')).rejects.toBeInstanceOf(
      GraphNotFoundError,
    );
    expect(repo.added).toHaveLength(0);
  });
});
