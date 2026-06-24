import { GraphNotFoundError } from '../../domain/errors';
import {
  conceptIdsToDetach,
  selectDeletionCandidates,
  sortForDeletion,
  type GraphMember,
} from '../../domain/services/graph-deletion-plan';
import type { GraphDeletionRepository } from '../../domain/ports/graph-deletion-repository';

/**
 * Deletes a graph and the entities it owns. Entities shared with another graph
 * are only unlinked; reusable types listed in keepTypes are preserved.
 * @example deleteGraph.execute('u1', 'g1', ['FLASHCARD'])
 */
export class DeleteGraphUseCase {
  constructor(private readonly graphs: GraphDeletionRepository) {}

  async execute(
    userId: string,
    grafoId: string,
    keepTypes: string[],
  ): Promise<{ success: boolean }> {
    if (!(await this.graphs.graphExists(grafoId, userId))) throw new GraphNotFoundError();
    const members = await this.graphs.listMembers(grafoId, userId);
    const candidates = selectDeletionCandidates(members, keepTypes);
    const toDelete = await this.excludeShared(userId, grafoId, candidates);
    await this.graphs.deleteGraph(userId, grafoId, {
      ordered: sortForDeletion(toDelete),
      detachConceptIds: conceptIdsToDetach(toDelete, keepTypes),
    });
    return { success: true };
  }

  // Shared entities (members of another graph) are kept — only unlinked by the
  // graph deletion — to avoid breaking those other graphs.
  private async excludeShared(
    userId: string,
    grafoId: string,
    candidates: GraphMember[],
  ): Promise<GraphMember[]> {
    const owned: GraphMember[] = [];
    for (const member of candidates) {
      const shared = await this.graphs.existsInOtherGraph(
        userId,
        member.tipoNode,
        member.referenciaId,
        grafoId,
      );
      if (!shared) owned.push(member);
    }
    return owned;
  }
}
