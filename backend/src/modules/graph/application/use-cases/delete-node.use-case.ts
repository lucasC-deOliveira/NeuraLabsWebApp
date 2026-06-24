import { NodeNotInGraphError, RootNodeError } from '../../domain/errors';
import type { NodeDeletionRepository } from '../../domain/ports/node-deletion-repository';

/**
 * Deletes a node and its referenced entity; optionally its connected neighbors.
 * The graph's root subject cannot be deleted on its own (only with the graph).
 * @example deleteNode.execute('u1', 'ref1', 'g1', true)
 */
export class DeleteNodeUseCase {
  constructor(private readonly nodes: NodeDeletionRepository) {}

  async execute(
    userId: string,
    refId: string,
    grafoId?: string,
    deleteConnected = false,
  ): Promise<{ success: boolean; deletedType: string }> {
    if (await this.nodes.isRootSubject(userId, refId)) throw new RootNodeError();
    const node = await this.nodes.findNode(userId, refId, grafoId);
    if (!node) throw new NodeNotInGraphError();
    const neighbors = deleteConnected ? await this.nodes.findConnectedNodes(userId, node.id) : [];
    await this.nodes.deleteNodes([...neighbors, node]);
    return { success: true, deletedType: node.tipoNode };
  }
}
