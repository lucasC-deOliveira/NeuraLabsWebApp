import { GraphNotFoundError } from '../../domain/errors';
import { assertCreatableNode, type CreateNodeInput } from '../../domain/services/node-creation';
import type { NodeCreationRepository } from '../../domain/ports/node-creation-repository';

/**
 * Creates a new node (entity + graph link) after validating the input per type.
 * @example createNode.execute('u1', 'g1', { tipoNode: 'CONCEITO', nome: 'Mitose' })
 */
export class CreateNodeUseCase {
  constructor(private readonly nodes: NodeCreationRepository) {}

  async execute(
    userId: string,
    grafoId: string,
    input: CreateNodeInput,
  ): Promise<{ nodeId: string }> {
    if (!(await this.nodes.graphExists(grafoId, userId))) throw new GraphNotFoundError();
    assertCreatableNode(input);
    return this.nodes.createNode(userId, grafoId, input);
  }
}
