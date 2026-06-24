import {
  NoNodesToExtractError,
  NoValidNodesError,
  ParentGraphNotFoundError,
} from '../../domain/errors';
import { assertValidSubgraphRelation } from '../../domain/services/subgraph';
import { centroid, externalEdges } from '../../domain/services/subgraph-extraction';
import type {
  ExtractableNode,
  ExtractSubgraphCommand,
  ExtractSubgraphInput,
  ExtractSubgraphRepository,
  ExtractSubgraphResult,
} from '../../domain/ports/extract-subgraph-repository';

/**
 * Extracts a set of nodes into a new child subgraph, leaving a GRAFO_REF in the
 * parent and rewiring the boundary edges to it.
 * @example extractSubgraph.execute('u1', 'parent', { nodeIds: ['a'], nome: 'Sub', tipoRelacao: 'APROFUNDA' })
 */
export class ExtractSubgraphUseCase {
  constructor(private readonly subgraphs: ExtractSubgraphRepository) {}

  async execute(
    userId: string,
    parentGrafoId: string,
    input: ExtractSubgraphInput,
  ): Promise<ExtractSubgraphResult> {
    if (!input.nodeIds.length) throw new NoNodesToExtractError();
    assertValidSubgraphRelation(input.tipoRelacao);
    if (!(await this.subgraphs.parentExists(parentGrafoId, userId)))
      throw new ParentGraphNotFoundError();
    const nodes = await this.subgraphs.findExtractableNodes(userId, parentGrafoId, input.nodeIds);
    if (!nodes.length) throw new NoValidNodesError();
    return this.subgraphs.extract(await this.planExtraction(userId, parentGrafoId, input, nodes));
  }

  private async planExtraction(
    userId: string,
    parentGrafoId: string,
    input: ExtractSubgraphInput,
    nodes: ExtractableNode[],
  ): Promise<ExtractSubgraphCommand> {
    const nodeRowIds = nodes.map((n) => n.id);
    const innerNodeIds = new Set(nodeRowIds);
    const edges = await this.subgraphs.findEdgesTouching(parentGrafoId, nodeRowIds);
    return {
      userId,
      parentGrafoId,
      nome: input.nome,
      tipoRelacao: input.tipoRelacao,
      nodeRowIds,
      innerNodeIds,
      center: centroid(nodes.map((n) => ({ x: n.posicaoX ?? 0, y: n.posicaoY ?? 0 }))),
      externalEdges: externalEdges(edges, innerNodeIds),
    };
  }
}
