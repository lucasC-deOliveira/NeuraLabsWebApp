import { NodeNotInGraphError } from '../../domain/errors';
import type { GraphNodeRepository } from '../../domain/ports/graph-node-repository';

/**
 * Removes a node's membership from a graph (link + its edges + performance rows),
 * keeping the underlying entity.
 * @example useCase.execute(userId, grafoId, refId)
 */
export class RemoveNodeUseCase {
  constructor(private readonly nodes: GraphNodeRepository) {}

  async execute(userId: string, grafoId: string, refId: string): Promise<{ success: boolean }> {
    const node = await this.nodes.findNodeInGraph(grafoId, userId, refId);
    if (!node) throw new NodeNotInGraphError();

    await this.nodes.removeNodeLink(node.id);
    return { success: true };
  }
}
