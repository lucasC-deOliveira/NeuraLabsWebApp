import type { GraphEdgesQuery, GraphEdgeView } from '../../domain/ports/graph-edges-query';

/**
 * Lists a graph's edges (with labeled endpoints) for the graph view.
 * @example getEdges.execute('u1', 'g1') // → GraphEdgeView[]
 */
export class GetEdgesUseCase {
  constructor(private readonly edges: GraphEdgesQuery) {}

  execute(userId: string, grafoId: string): Promise<GraphEdgeView[]> {
    return this.edges.listForGraph(userId, grafoId);
  }
}
