import type { GraphInfoView, GraphQuery } from '../../domain/ports/graph-query';

/**
 * Returns a graph's info panel (with parent name), or null when not owned.
 * @example getGraphInfo.execute('u1', 'g1') // → GraphInfoView | null
 */
export class GetGraphInfoUseCase {
  constructor(private readonly graphs: GraphQuery) {}

  execute(userId: string, grafoId: string): Promise<GraphInfoView | null> {
    return this.graphs.findInfo(userId, grafoId);
  }
}
