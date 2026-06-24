import type { GraphQuery, GraphSummary } from '../../domain/ports/graph-query';

/**
 * Lists the user's knowledge graphs (newest first) with their children count.
 * @example listGraphs.execute('u1') // → GraphSummary[]
 */
export class ListGraphsUseCase {
  constructor(private readonly graphs: GraphQuery) {}

  execute(userId: string): Promise<GraphSummary[]> {
    return this.graphs.listForUser(userId);
  }
}
