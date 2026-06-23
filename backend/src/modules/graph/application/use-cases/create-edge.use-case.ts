import { getAllowedRelations, isRelationAllowed } from '../../domain/services/relation-rules';
import { EdgeWeight } from '../../domain/value-objects/edge-weight';
import {
  DuplicateEdgeError,
  GraphNodesNotFoundError,
  RelationNotAllowedError,
} from '../../domain/errors';
import type { GraphEdgeRepository, GraphNodeRef } from '../../domain/ports/graph-edge-repository';

export interface CreateEdgeCommand {
  userId: string;
  grafoId: string;
  sourceNodeId: string;
  targetNodeId: string;
  tipoRelacao: string;
  peso?: number;
}

/**
 * Creates a relation (edge) between two nodes of a graph, enforcing the relation
 * rules, the weight range and uniqueness.
 * @example useCase.execute({ userId, grafoId, sourceNodeId, targetNodeId, tipoRelacao: 'DEFINE' })
 */
export class CreateEdgeUseCase {
  constructor(private readonly edges: GraphEdgeRepository) {}

  async execute(cmd: CreateEdgeCommand): Promise<{ edgeId: string }> {
    const peso = cmd.peso === undefined ? EdgeWeight.default() : EdgeWeight.create(cmd.peso);
    const { source, target } = await this.resolveEndpoints(cmd);
    this.assertRelationAllowed(source, target, cmd.tipoRelacao);

    if (await this.edges.edgeExists(cmd.grafoId, source.id, target.id, cmd.tipoRelacao)) {
      throw new DuplicateEdgeError();
    }

    const edge = await this.edges.createEdge({
      grafoId: cmd.grafoId,
      sourceNodeId: source.id,
      targetNodeId: target.id,
      tipoRelacao: cmd.tipoRelacao,
      peso: peso.value,
    });
    return { edgeId: edge.id };
  }

  private async resolveEndpoints(
    cmd: CreateEdgeCommand,
  ): Promise<{ source: GraphNodeRef; target: GraphNodeRef }> {
    const [source, target] = await Promise.all([
      this.edges.findNodeInGraph(cmd.grafoId, cmd.userId, cmd.sourceNodeId),
      this.edges.findNodeInGraph(cmd.grafoId, cmd.userId, cmd.targetNodeId),
    ]);
    if (!source || !target) throw new GraphNodesNotFoundError();
    return { source, target };
  }

  private assertRelationAllowed(
    source: GraphNodeRef,
    target: GraphNodeRef,
    relation: string,
  ): void {
    if (isRelationAllowed(source.tipoNode, target.tipoNode, relation)) return;
    const allowed = getAllowedRelations(source.tipoNode, target.tipoNode);
    throw new RelationNotAllowedError(source.tipoNode, target.tipoNode, relation, allowed);
  }
}
