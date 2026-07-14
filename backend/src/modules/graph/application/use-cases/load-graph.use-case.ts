import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';
import type { GraphViewCacheRepository } from '../../domain/ports/graph-view-cache-repository';

/**
 * Loads a graph's renderable view, served from a per-graph cache while the graph's
 * signature (counts + max timestamps) is unchanged — avoiding the ~13 queries of
 * buildKnowledgeGraph on repeated reads.
 * @example loadGraph.execute('u1', 'g1') // → { nodes, edges }
 */
export class LoadGraphUseCase {
  constructor(
    private readonly view: GraphViewRepository,
    private readonly cache: GraphViewCacheRepository,
  ) {}

  async execute(userId: string, grafoId: string): Promise<GraphView> {
    const assinatura = await this.cache.currentSignature(userId, grafoId);
    const cached = await this.cache.load(grafoId);
    if (cached && cached.assinatura === assinatura) return cached.view;
    const view = await this.view.loadView(userId, grafoId);
    await this.cache.save(userId, grafoId, assinatura, view);
    return view;
  }
}
