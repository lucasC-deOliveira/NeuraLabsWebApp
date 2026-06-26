import { describe, it, expect } from 'vitest';
import { MergeDuplicateNodesUseCase } from './merge-duplicate-nodes.use-case';
import { MergeKeepNotFoundError } from '../../domain/errors';
import type { DuplicateMergeRepository } from '../../domain/ports/duplicate-merge-repository';
import type { MergeEdge } from '../../domain/services/edge-merge';
import type { GraphNodeDeleter } from '../../domain/ports/graph-node-deleter';

class FakeMerge implements DuplicateMergeRepository {
  moved: Array<{ moveSrc: string[]; moveTgt: string[] }> = [];
  deletedEdgesOf: string[] = [];
  constructor(
    private readonly links: Map<string, string | null>,
    private readonly edges: Map<string, MergeEdge[]> = new Map(),
  ) {}
  async findNodeLinkId(_u: string, _g: string, refId: string): Promise<string | null> {
    return this.links.get(refId) ?? null;
  }
  async loadAdjacentEdges(ncId: string): Promise<MergeEdge[]> {
    return this.edges.get(ncId) ?? [];
  }
  async moveEdges(moveSrc: string[], moveTgt: string[]): Promise<number> {
    this.moved.push({ moveSrc, moveTgt });
    return moveSrc.length + moveTgt.length;
  }
  async deleteEdgesOf(ncId: string): Promise<void> {
    this.deletedEdgesOf.push(ncId);
  }
}

class FakeDeleter implements GraphNodeDeleter {
  deleted: string[] = [];
  async deleteNode(_u: string, nodeId: string): Promise<void> {
    this.deleted.push(nodeId);
  }
}

describe('MergeDuplicateNodesUseCase', () => {
  it('throws when the keep node is not in the graph', async () => {
    const repo = new FakeMerge(new Map([['keep', null]]));
    const useCase = new MergeDuplicateNodesUseCase(repo, new FakeDeleter());
    await expect(useCase.execute('u1', 'g1', 'keep', ['d'])).rejects.toBeInstanceOf(
      MergeKeepNotFoundError,
    );
  });

  it('rewires the duplicate edges onto keep and deletes the duplicate', async () => {
    const edges = new Map<string, MergeEdge[]>([
      ['ncDel', [{ id: 'e1', nodeOrigemId: 'ncDel', nodeDestinoId: 'x', tipoRelacao: 'R' }]],
      ['ncKeep', []],
    ]);
    const repo = new FakeMerge(
      new Map([
        ['keep', 'ncKeep'],
        ['dup', 'ncDel'],
      ]),
      edges,
    );
    const deleter = new FakeDeleter();
    const useCase = new MergeDuplicateNodesUseCase(repo, deleter);

    const res = await useCase.execute('u1', 'g1', 'keep', ['dup']);

    expect(res).toEqual({ merged: 1, edgesMoved: 1 });
    expect(repo.moved).toEqual([{ moveSrc: ['e1'], moveTgt: [] }]);
    expect(repo.deletedEdgesOf).toEqual(['ncDel']);
    expect(deleter.deleted).toEqual(['dup']);
  });

  it('skips a duplicate that resolves to the keep node itself', async () => {
    const repo = new FakeMerge(
      new Map([
        ['keep', 'ncKeep'],
        ['dup', 'ncKeep'],
      ]),
    );
    const deleter = new FakeDeleter();
    const useCase = new MergeDuplicateNodesUseCase(repo, deleter);
    const res = await useCase.execute('u1', 'g1', 'keep', ['dup']);
    expect(res).toEqual({ merged: 1, edgesMoved: 0 });
    expect(deleter.deleted).toEqual([]);
  });
});
