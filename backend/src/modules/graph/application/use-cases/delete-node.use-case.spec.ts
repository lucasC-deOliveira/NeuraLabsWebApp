import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteNodeUseCase } from './delete-node.use-case';
import { NodeNotInGraphError } from '../../domain/errors';
import type {
  DeletableNode,
  NodeDeletionRepository,
} from '../../domain/ports/node-deletion-repository';

class FakeNodeDeletionRepository implements NodeDeletionRepository {
  node: DeletableNode | null = null;
  connected: DeletableNode[] = [];
  deleted: DeletableNode[] | null = null;

  async findNode(): Promise<DeletableNode | null> {
    return this.node;
  }
  async findConnectedNodes(): Promise<DeletableNode[]> {
    return this.connected;
  }
  async deleteNodes(nodes: DeletableNode[]): Promise<void> {
    this.deleted = nodes;
  }
}

describe('DeleteNodeUseCase', () => {
  let repo: FakeNodeDeletionRepository;
  let useCase: DeleteNodeUseCase;

  beforeEach(() => {
    repo = new FakeNodeDeletionRepository();
    useCase = new DeleteNodeUseCase(repo);
  });

  it('throws when the node is not found', async () => {
    repo.node = null;
    await expect(useCase.execute('u1', 'missing')).rejects.toBeInstanceOf(NodeNotInGraphError);
  });

  it('deletes the single node and reports its type', async () => {
    repo.node = { id: 'n1', tipoNode: 'CONCEITO', referenciaId: 'c1' };
    const res = await useCase.execute('u1', 'c1');
    expect(res).toEqual({ success: true, deletedType: 'CONCEITO' });
    expect(repo.deleted).toEqual([{ id: 'n1', tipoNode: 'CONCEITO', referenciaId: 'c1' }]);
  });

  it('deletes connected neighbors before the node when requested', async () => {
    repo.node = { id: 'n1', tipoNode: 'CONCEITO', referenciaId: 'c1' };
    repo.connected = [{ id: 'n2', tipoNode: 'NOTA', referenciaId: 'no1' }];
    await useCase.execute('u1', 'c1', 'g1', true);
    expect(repo.deleted?.map((n) => n.id)).toEqual(['n2', 'n1']);
  });

  it('does not fetch neighbors when deleteConnected is false', async () => {
    repo.node = { id: 'n1', tipoNode: 'CONCEITO', referenciaId: 'c1' };
    repo.connected = [{ id: 'n2', tipoNode: 'NOTA', referenciaId: 'no1' }];
    await useCase.execute('u1', 'c1');
    expect(repo.deleted?.map((n) => n.id)).toEqual(['n1']);
  });
});
