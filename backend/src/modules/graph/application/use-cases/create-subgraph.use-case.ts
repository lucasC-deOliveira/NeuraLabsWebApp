import { ParentGraphNotFoundError } from '../../domain/errors';
import { assertValidSubgraphRelation } from '../../domain/services/subgraph';
import type {
  CreateSubgraphInput,
  CreateSubgraphRepository,
} from '../../domain/ports/create-subgraph-repository';

/**
 * Creates a subgraph under a parent graph, anchored by a GRAFO_REF node.
 * @example createSubgraph.execute('u1', 'parent', { nome: 'Sub', tipoRelacao: 'APROFUNDA' })
 */
export class CreateSubgraphUseCase {
  constructor(private readonly subgraphs: CreateSubgraphRepository) {}

  async execute(
    userId: string,
    parentGrafoId: string,
    input: CreateSubgraphInput,
  ): Promise<{ grafoId: string; grafoRefNodeId: string }> {
    if (!(await this.subgraphs.parentExists(parentGrafoId, userId)))
      throw new ParentGraphNotFoundError();
    assertValidSubgraphRelation(input.tipoRelacao);
    return this.subgraphs.createSubgraph(userId, parentGrafoId, input);
  }
}
