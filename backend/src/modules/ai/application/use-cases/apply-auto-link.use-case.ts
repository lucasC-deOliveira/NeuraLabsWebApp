import type { GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';

export interface AutoLinkEdge {
  sourceId: string;
  targetId: string;
  relacao: string;
}

/**
 * Applies a set of suggested edges to the graph, skipping any that are duplicate
 * or invalid, and returns how many were actually created.
 * @example applyAutoLink.execute('u1', 'g1', [{ sourceId, targetId, relacao }])
 */
export class ApplyAutoLinkUseCase {
  constructor(private readonly writer: GraphEdgeWriter) {}

  async execute(
    userId: string,
    grafoId: string,
    edges: AutoLinkEdge[],
  ): Promise<{ added: number }> {
    let added = 0;
    for (const edge of edges) {
      if (await this.tryCreate(userId, grafoId, edge)) added++;
    }
    return { added };
  }

  private async tryCreate(userId: string, grafoId: string, edge: AutoLinkEdge): Promise<boolean> {
    try {
      await this.writer.createEdge(userId, grafoId, {
        sourceNodeId: edge.sourceId,
        targetNodeId: edge.targetId,
        tipoRelacao: edge.relacao,
      });
      return true;
    } catch {
      // duplicate/invalid edge: skip it
      return false;
    }
  }
}
