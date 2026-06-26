import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateEdgeUseCase } from './update-edge.use-case';
import { EdgeNotFoundError, InvalidEdgeWeightError } from '../../domain/errors';
import type { GraphEdgeRepository, GraphNodeRef } from '../../domain/ports/graph-edge-repository';

class FakeGraphEdgeRepository implements GraphEdgeRepository {
  readonly ownedEdges = new Set<string>();
  updated?: { edgeId: string; data: { tipoRelacao?: string; peso?: number } };
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
  async updateEdge(edgeId: string, data: { tipoRelacao?: string; peso?: number }): Promise<void> {
    this.updated = { edgeId, data };
  }
  async deleteEdge(): Promise<void> {}
}

describe('UpdateEdgeUseCase', () => {
  let repo: FakeGraphEdgeRepository;
  let useCase: UpdateEdgeUseCase;

  beforeEach(() => {
    repo = new FakeGraphEdgeRepository();
    repo.ownedEdges.add('edge-1');
    useCase = new UpdateEdgeUseCase(repo);
  });

  it('updates an owned edge', async () => {
    const res = await useCase.execute({ userId: 'u1', grafoId: 'g1', edgeId: 'edge-1', peso: 1.5 });
    expect(res).toEqual({ success: true });
    expect(repo.updated).toEqual({ edgeId: 'edge-1', data: { tipoRelacao: undefined, peso: 1.5 } });
  });

  it('rejects an out-of-range weight before touching the repo', async () => {
    await expect(
      useCase.execute({ userId: 'u1', grafoId: 'g1', edgeId: 'edge-1', peso: 5 }),
    ).rejects.toBeInstanceOf(InvalidEdgeWeightError);
    expect(repo.updated).toBeUndefined();
  });

  it('throws when the edge is not owned/found', async () => {
    await expect(
      useCase.execute({ userId: 'u1', grafoId: 'g1', edgeId: 'missing' }),
    ).rejects.toBeInstanceOf(EdgeNotFoundError);
  });
});
