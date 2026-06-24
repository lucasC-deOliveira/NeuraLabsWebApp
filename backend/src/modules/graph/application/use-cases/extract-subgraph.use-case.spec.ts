import { describe, it, expect, beforeEach } from 'vitest';
import { ExtractSubgraphUseCase } from './extract-subgraph.use-case';
import {
  InvalidSubgraphRelationError,
  NoNodesToExtractError,
  NoValidNodesError,
  ParentGraphNotFoundError,
} from '../../domain/errors';
import type { ExtractEdge } from '../../domain/services/subgraph-extraction';
import type {
  ExtractableNode,
  ExtractSubgraphCommand,
  ExtractSubgraphRepository,
  ExtractSubgraphResult,
} from '../../domain/ports/extract-subgraph-repository';

class FakeExtractSubgraphRepository implements ExtractSubgraphRepository {
  parents = new Set<string>();
  nodes: ExtractableNode[] = [];
  edges: ExtractEdge[] = [];
  command: ExtractSubgraphCommand | null = null;
  async parentExists(parentGrafoId: string): Promise<boolean> {
    return this.parents.has(parentGrafoId);
  }
  async findExtractableNodes(): Promise<ExtractableNode[]> {
    return this.nodes;
  }
  async findEdgesTouching(): Promise<ExtractEdge[]> {
    return this.edges;
  }
  async extract(command: ExtractSubgraphCommand): Promise<ExtractSubgraphResult> {
    this.command = command;
    return { grafoId: 'child', grafoRefNodeId: 'child', movedCount: 1, rewiredEdgeCount: 0 };
  }
}

const input = { nodeIds: ['ref-a'], nome: 'Sub', tipoRelacao: 'APROFUNDA' };

describe('ExtractSubgraphUseCase', () => {
  let repo: FakeExtractSubgraphRepository;
  let useCase: ExtractSubgraphUseCase;

  beforeEach(() => {
    repo = new FakeExtractSubgraphRepository();
    repo.parents.add('parent');
    repo.nodes = [
      { id: 'a', posicaoX: 0, posicaoY: 0 },
      { id: 'b', posicaoX: 4, posicaoY: 2 },
    ];
    useCase = new ExtractSubgraphUseCase(repo);
  });

  it('throws when no nodes are selected', async () => {
    await expect(useCase.execute('u1', 'parent', { ...input, nodeIds: [] })).rejects.toBeInstanceOf(
      NoNodesToExtractError,
    );
  });

  it('throws on an invalid relation', async () => {
    await expect(
      useCase.execute('u1', 'parent', { ...input, tipoRelacao: 'CONTEM' }),
    ).rejects.toBeInstanceOf(InvalidSubgraphRelationError);
  });

  it('throws when the parent is missing', async () => {
    await expect(useCase.execute('u1', 'missing', input)).rejects.toBeInstanceOf(
      ParentGraphNotFoundError,
    );
  });

  it('throws when no valid nodes are found', async () => {
    repo.nodes = [];
    await expect(useCase.execute('u1', 'parent', input)).rejects.toBeInstanceOf(NoValidNodesError);
  });

  it('plans the centroid and boundary edges', async () => {
    repo.edges = [
      { id: 'inner', nodeOrigemId: 'a', nodeDestinoId: 'b' },
      { id: 'cross', nodeOrigemId: 'a', nodeDestinoId: 'z' },
    ];
    const res = await useCase.execute('u1', 'parent', input);
    expect(res.grafoId).toBe('child');
    expect(repo.command?.center).toEqual({ x: 2, y: 1 });
    expect(repo.command?.externalEdges.map((e) => e.id)).toEqual(['cross']);
  });
});
