import type {
  ConceptGraphMembership,
  NodeDetails,
  NodeDetailsQuery,
} from '../../domain/ports/node-details-query';

/**
 * Returns a node's content (shaped by its type), or null when not owned.
 * @example getNodeDetails.execute('u1', 'NOTA', 'ref1')
 */
export class GetNodeDetailsUseCase {
  constructor(private readonly nodes: NodeDetailsQuery) {}

  execute(userId: string, tipoNode: string, refId: string): Promise<NodeDetails | null> {
    return this.nodes.findDetails(userId, tipoNode, refId);
  }

  /** Returns the affected graphs before a concept is edited.
   * @example getNodeDetails.listConceptGraphs('u1', 'concept-1')
   */
  listConceptGraphs(userId: string, refId: string): Promise<ConceptGraphMembership[]> {
    return this.nodes.findConceptGraphs(userId, refId);
  }
}
