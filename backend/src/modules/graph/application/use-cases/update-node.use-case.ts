import { NodeNotInGraphError } from '../../domain/errors';
import { assertUpdatableNode, type NodeUpdateData } from '../../domain/services/node-update';
import type { NodeUpdateRepository } from '../../domain/ports/node-update-repository';

/**
 * Edits a node's entity after validating the type and (for notes) the subtype.
 * Throws when nothing matched (wrong owner or missing node).
 * @example updateNode.execute('u1', 'CONCEITO', 'ref1', { nome: 'New' })
 */
export class UpdateNodeUseCase {
  constructor(private readonly nodes: NodeUpdateRepository) {}

  async execute(
    userId: string,
    tipoNode: string,
    refId: string,
    data: NodeUpdateData,
  ): Promise<{ success: boolean }> {
    assertUpdatableNode(tipoNode, data);
    const { updated } = await this.nodes.updateNode(userId, tipoNode, refId, data);
    if (updated === 0) throw new NodeNotInGraphError();
    // Bump the node timestamp so the graph view cache invalidates on this edit.
    await this.nodes.touchNodes(userId, refId);
    return { success: true };
  }
}
