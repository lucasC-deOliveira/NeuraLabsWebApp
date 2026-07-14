import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';

/**
 * Loads a graph's renderable view.
 * @example loadGraph.execute('u1', 'g1') // → { nodes, edges }
 */
export class LoadGraphUseCase {
  constructor(private readonly view: GraphViewRepository) {}

  execute(userId: string, grafoId: string): Promise<GraphView> {
    return this.view.loadView(userId, grafoId);
  }
}
