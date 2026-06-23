import { describe, it, expect, beforeEach } from 'vitest';
import { CreateEdgeUseCase } from './create-edge.use-case';
import {
  DuplicateEdgeError,
  GraphNodesNotFoundError,
  InvalidEdgeWeightError,
  RelationNotAllowedError,
} from '../../domain/errors';
import type {
  CreateEdgeData,
  GraphEdgeRepository,
  GraphNodeRef,
} from '../../domain/ports/graph-edge-repository';

class FakeGraphEdgeRepository implements GraphEdgeRepository {
  readonly nodes = new Map<string, GraphNodeRef>();
  readonly duplicates = new Set<string>();
  readonly created: CreateEdgeData[] = [];
  readonly ownedEdges = new Set<string>();
  updated?: { edgeId: string; data: { tipoRelacao?: string; peso?: number } };
  readonly deleted: string[] = [];

  async findNodeInGraph(
    _g: string,
    _u: string,
    referenciaId: string,
  ): Promise<GraphNodeRef | null> {
    return this.nodes.get(referenciaId) ?? null;
  }
  async edgeExists(_g: string, s: string, t: string, rel: string): Promise<boolean> {
    return this.duplicates.has(`${s}|${t}|${rel}`);
  }
  async createEdge(data: CreateEdgeData): Promise<{ id: string }> {
    this.created.push(data);
    return { id: 'edge-1' };
  }
  async findOwnedEdge(_g: string, edgeId: string): Promise<{ id: string } | null> {
    return this.ownedEdges.has(edgeId) ? { id: edgeId } : null;
  }
  async updateEdge(edgeId: string, data: { tipoRelacao?: string; peso?: number }): Promise<void> {
    this.updated = { edgeId, data };
  }
  async deleteEdge(edgeId: string): Promise<void> {
    this.deleted.push(edgeId);
  }
}

describe('CreateEdgeUseCase', () => {
  let repo: FakeGraphEdgeRepository;
  let useCase: CreateEdgeUseCase;

  beforeEach(() => {
    repo = new FakeGraphEdgeRepository();
    repo.nodes.set('nota', { id: 'node-nota', tipoNode: 'NOTA' });
    repo.nodes.set('conceito', { id: 'node-conceito', tipoNode: 'CONCEITO' });
    useCase = new CreateEdgeUseCase(repo);
  });

  const cmd = (over: Partial<Parameters<CreateEdgeUseCase['execute']>[0]> = {}) => ({
    userId: 'u1',
    grafoId: 'g1',
    sourceNodeId: 'nota',
    targetNodeId: 'conceito',
    tipoRelacao: 'DEFINE',
    ...over,
  });

  it('creates an edge between the resolved nodes with the default weight', async () => {
    const res = await useCase.execute(cmd());
    expect(res).toEqual({ edgeId: 'edge-1' });
    expect(repo.created[0]).toMatchObject({
      grafoId: 'g1',
      sourceNodeId: 'node-nota',
      targetNodeId: 'node-conceito',
      tipoRelacao: 'DEFINE',
      peso: 1,
    });
  });

  it('passes a custom weight through', async () => {
    await useCase.execute(cmd({ peso: 1.5 }));
    expect(repo.created[0].peso).toBe(1.5);
  });

  it('rejects an out-of-range weight', async () => {
    await expect(useCase.execute(cmd({ peso: 3 }))).rejects.toBeInstanceOf(InvalidEdgeWeightError);
    expect(repo.created).toHaveLength(0);
  });

  it('throws when a node is missing from the graph', async () => {
    await expect(useCase.execute(cmd({ sourceNodeId: 'ghost' }))).rejects.toBeInstanceOf(
      GraphNodesNotFoundError,
    );
  });

  it('throws when the relation is not allowed between the node types', async () => {
    await expect(useCase.execute(cmd({ tipoRelacao: 'CONTEM' }))).rejects.toBeInstanceOf(
      RelationNotAllowedError,
    );
  });

  it('throws on a duplicate edge', async () => {
    repo.duplicates.add('node-nota|node-conceito|DEFINE');
    await expect(useCase.execute(cmd())).rejects.toBeInstanceOf(DuplicateEdgeError);
    expect(repo.created).toHaveLength(0);
  });
});
