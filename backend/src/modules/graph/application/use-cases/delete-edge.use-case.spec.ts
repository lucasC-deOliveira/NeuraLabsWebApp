import { describe, it, expect, beforeEach } from 'vitest';
import { DeleteEdgeUseCase } from './delete-edge.use-case';
import { EdgeNotFoundError } from '../../domain/errors';
import type { GraphEdgeRepository, GraphNodeRef } from '../../domain/ports/graph-edge-repository';

class FakeGraphEdgeRepository implements GraphEdgeRepository {
  readonly ownedEdges = new Set<string>();
  readonly deleted: string[] = [];
  async findNodeInGraph(): Promise<GraphNodeRef | null> {
    return null;
  }
  async edgeExists(): Promise<boolean> {
    return false;
  }
  async createEdge(): Promise<{ id: string }> {
    return { id: 'x' };
  }
  async findOwnedEdge(_g: string, edgeId: string): Promise<{ id: string } | null> {
    return this.ownedEdges.has(edgeId) ? { id: edgeId } : null;
  }
  async updateEdge(): Promise<void> {}
  async deleteEdge(edgeId: string): Promise<void> {
    this.deleted.push(edgeId);
  }
}

describe('DeleteEdgeUseCase', () => {
  let repo: FakeGraphEdgeRepository;
  let useCase: DeleteEdgeUseCase;

  beforeEach(() => {
    repo = new FakeGraphEdgeRepository();
    repo.ownedEdges.add('edge-1');
    useCase = new DeleteEdgeUseCase(repo);
  });

  it('deletes an owned edge', async () => {
    const res = await useCase.execute('u1', 'g1', 'edge-1');
    expect(res).toEqual({ success: true });
    expect(repo.deleted).toEqual(['edge-1']);
  });

  it('throws when the edge is not owned/found', async () => {
    await expect(useCase.execute('u1', 'g1', 'missing')).rejects.toBeInstanceOf(EdgeNotFoundError);
    expect(repo.deleted).toHaveLength(0);
  });
});
