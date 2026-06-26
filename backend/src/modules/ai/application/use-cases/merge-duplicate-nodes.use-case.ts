import { MergeKeepNotFoundError } from '../../domain/errors';
import { planEdgeMerge } from '../../domain/services/edge-merge';
import type { DuplicateMergeRepository } from '../../domain/ports/duplicate-merge-repository';
import type { GraphNodeDeleter } from '../../domain/ports/graph-node-deleter';

/**
 * Merges duplicate nodes into a single "keep" node: rewires the duplicates' edges
 * onto it (dropping conflicts), then deletes the duplicates.
 * @example merge.execute('u1', 'g1', 'keepRef', ['dupRef'])
 */
export class MergeDuplicateNodesUseCase {
  constructor(
    private readonly repo: DuplicateMergeRepository,
    private readonly deleter: GraphNodeDeleter,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    keepId: string,
    deleteIds: string[],
  ): Promise<{ merged: number; edgesMoved: number }> {
    const keepNc = await this.repo.findNodeLinkId(userId, grafoId, keepId);
    if (!keepNc) throw new MergeKeepNotFoundError();
    let edgesMoved = 0;
    for (const deleteId of deleteIds) {
      edgesMoved += await this.mergeOne(userId, grafoId, keepNc, deleteId);
    }
    return { merged: deleteIds.length, edgesMoved };
  }

  private async mergeOne(
    userId: string,
    grafoId: string,
    keepNc: string,
    deleteId: string,
  ): Promise<number> {
    const delNc = await this.repo.findNodeLinkId(userId, grafoId, deleteId);
    if (!delNc || delNc === keepNc) return 0;
    const [delEdges, keepEdges] = await Promise.all([
      this.repo.loadAdjacentEdges(delNc),
      this.repo.loadAdjacentEdges(keepNc),
    ]);
    const plan = planEdgeMerge(delEdges, keepEdges, delNc, keepNc);
    const moved = await this.repo.moveEdges(plan.moveSrc, plan.moveTgt, keepNc);
    await this.repo.deleteEdgesOf(delNc);
    await this.deleter.deleteNode(userId, deleteId, grafoId);
    return moved;
  }
}
