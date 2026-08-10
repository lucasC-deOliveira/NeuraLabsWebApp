import { GraphNotFoundError } from '../../domain/errors';
import type {
  ExportEdge,
  ExportNode,
  ExportPayload,
  GraphExportRepository,
} from '../../domain/ports/graph-export-repository';
import type { NodeDetailsQuery } from '../../domain/ports/node-details-query';
import type { GraphEdgesQuery } from '../../domain/ports/graph-edges-query';

/**
 * Exports a graph in the vault import format (ref = referenciaId): every node
 * with its full content, plus the edges. Used by the desktop vault (Pull).
 * @example exportGraph.execute('u1', 'g1')
 */
export class ExportGraphUseCase {
  constructor(
    private readonly graphs: GraphExportRepository,
    private readonly details: NodeDetailsQuery,
    private readonly edges: GraphEdgesQuery,
  ) {}

  async execute(userId: string, grafoId: string): Promise<ExportPayload> {
    const grafo = await this.graphs.findGraph(grafoId, userId);
    if (!grafo) throw new GraphNotFoundError();
    return {
      grafo,
      nodes: await this.buildNodes(userId, grafoId),
      edges: await this.buildEdges(userId, grafoId),
    };
  }

  // Nodes without resolvable content (e.g. dangling refs) are skipped.
  private async buildNodes(userId: string, grafoId: string): Promise<ExportNode[]> {
    const rows = await this.graphs.listNodes(grafoId, userId);
    const nodes: ExportNode[] = [];
    for (const r of rows) {
      const content = await this.details.findDetails(userId, r.tipoNode, r.referenciaId);
      if (!content) continue;
      nodes.push({
        ref: r.referenciaId,
        tipo: r.tipoNode,
        posicaoX: r.posicaoX,
        posicaoY: r.posicaoY,
        nivelDominio: r.nivelDominio,
        pesoEdital: r.pesoEdital,
        ...content,
      });
    }
    return nodes;
  }

  private async buildEdges(userId: string, grafoId: string): Promise<ExportEdge[]> {
    const edges = await this.edges.listForGraph(userId, grafoId);
    return edges.map((e) => ({
      origem: e.source,
      destino: e.target,
      relacao: e.tipoRelacao,
      peso: e.peso,
    }));
  }
}
