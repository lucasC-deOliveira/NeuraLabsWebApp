import { GraphNotFoundError } from '../../domain/errors';
import type { GraphNodeRepository } from '../../domain/ports/graph-node-repository';

/**
 * Links an already-existing entity into a graph (creates only the membership).
 * @example useCase.execute(userId, grafoId, 'CONCEITO', entityId)
 */
export class AddExistingNodeUseCase {
  constructor(private readonly nodes: GraphNodeRepository) {}

  async execute(
    userId: string,
    grafoId: string,
    tipoNode: string,
    entityId: string,
  ): Promise<{ success: boolean; nodeId: string }> {
    if (!(await this.nodes.graphExists(grafoId, userId))) throw new GraphNotFoundError();
    await this.nodes.addNodeLink(grafoId, userId, tipoNode, entityId);
    return { success: true, nodeId: entityId };
  }
}
