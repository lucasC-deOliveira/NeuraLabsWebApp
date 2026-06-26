import { SubgraphNotFoundError } from '../../domain/errors';
import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';
import type { LoadGraphUseCase } from './load-graph.use-case';

/**
 * Loads a child subgraph's view (the "expand" navigation), failing when the
 * subgraph is missing or not owned.
 * @example expandSubgraph.execute('u1', 'child')
 */
export class ExpandSubgraphUseCase {
  constructor(
    private readonly view: GraphViewRepository,
    private readonly loadGraph: LoadGraphUseCase,
  ) {}

  async execute(userId: string, childGrafoId: string): Promise<GraphView> {
    if (!(await this.view.exists(childGrafoId, userId))) throw new SubgraphNotFoundError();
    return this.loadGraph.execute(userId, childGrafoId);
  }
}
