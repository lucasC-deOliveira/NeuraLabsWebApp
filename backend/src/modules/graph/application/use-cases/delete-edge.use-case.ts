import { EdgeNotFoundError } from '../../domain/errors';
import type { GraphEdgeRepository } from '../../domain/ports/graph-edge-repository';

/**
 * Deletes a relation (edge) from a graph. Throws when the edge is not owned.
 * @example useCase.execute(userId, grafoId, edgeId)
 */
export class DeleteEdgeUseCase {
  constructor(private readonly edges: GraphEdgeRepository) {}

  async execute(userId: string, grafoId: string, edgeId: string): Promise<{ success: boolean }> {
    const edge = await this.edges.findOwnedEdge(grafoId, edgeId, userId);
    if (!edge) throw new EdgeNotFoundError(edgeId);

    await this.edges.deleteEdge(edgeId);
    return { success: true };
  }
}
