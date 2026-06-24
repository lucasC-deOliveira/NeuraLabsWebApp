import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';

/**
 * Loads a graph's renderable view, lazily creating its root subject first.
 * @example loadGraph.execute('u1', 'g1') // → { nodes, edges }
 */
export class LoadGraphUseCase {
  constructor(private readonly view: GraphViewRepository) {}

  async execute(userId: string, grafoId: string): Promise<GraphView> {
    await this.view.ensureRoot(userId, grafoId);
    return this.view.loadView(userId, grafoId);
  }
}
