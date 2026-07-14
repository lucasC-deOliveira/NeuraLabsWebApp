import { describe, it, expect, beforeEach } from 'vitest';
import { RemoveNodeUseCase } from './remove-node.use-case';
import { NodeNotInGraphError } from '../../domain/errors';
import type { GraphNodeRepository } from '../../domain/ports/graph-node-repository';

class FakeGraphNodeRepository implements GraphNodeRepository {
  readonly nodesInGraph = new Map<string, string>();
  readonly removed: string[] = [];
  async graphExists(): Promise<boolean> {
    return true;
  }
  async addNodeLink(): Promise<void> {}
  async findNodeInGraph(_g: string, _u: string, refId: string): Promise<{ id: string } | null> {
    const id = this.nodesInGraph.get(refId);
    return id ? { id } : null;
  }
  async removeNodeLink(nodeId: string): Promise<void> {
    this.removed.push(nodeId);
  }
}

describe('RemoveNodeUseCase', () => {
  let repo: FakeGraphNodeRepository;
  let useCase: RemoveNodeUseCase;

  beforeEach(() => {
    repo = new FakeGraphNodeRepository();
    repo.nodesInGraph.set('ref-1', 'node-1');
    useCase = new RemoveNodeUseCase(repo);
  });

  it('removes the membership of a node', async () => {
    const res = await useCase.execute('u1', 'g1', 'ref-1');
    expect(res).toEqual({ success: true });
    expect(repo.removed).toEqual(['node-1']);
  });

  it('throws when the node is not in the graph', async () => {
    await expect(useCase.execute('u1', 'g1', 'missing')).rejects.toBeInstanceOf(
      NodeNotInGraphError,
    );
  });
});
