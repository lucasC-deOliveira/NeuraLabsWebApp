import { describe, it, expect, beforeEach } from 'vitest';
import { ExpandSubgraphUseCase } from './expand-subgraph.use-case';
import { LoadGraphUseCase } from './load-graph.use-case';
import { SubgraphNotFoundError } from '../../domain/errors';
import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';
import type { GraphViewCacheRepository } from '../../domain/ports/graph-view-cache-repository';

const view: GraphView = { nodes: [], edges: [] };

class FakeGraphViewRepository implements GraphViewRepository {
  graphs = new Set<string>();
  loaded: string | null = null;
  async exists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async loadView(_userId: string, grafoId: string): Promise<GraphView> {
    this.loaded = grafoId;
    return view;
  }
}

// Cache que sempre erra — força o LoadGraphUseCase a delegar em loadView.
class NoopGraphViewCache implements GraphViewCacheRepository {
  async currentSignature(): Promise<string> {
    return 'sig';
  }
  async load(): Promise<null> {
    return null;
  }
  async save(): Promise<void> {}
}

describe('ExpandSubgraphUseCase', () => {
  let repo: FakeGraphViewRepository;
  let useCase: ExpandSubgraphUseCase;

  beforeEach(() => {
    repo = new FakeGraphViewRepository();
    repo.graphs.add('child');
    useCase = new ExpandSubgraphUseCase(repo, new LoadGraphUseCase(repo, new NoopGraphViewCache()));
  });

  it('loads the child view when it exists', async () => {
    expect(await useCase.execute('u1', 'child')).toBe(view);
    expect(repo.loaded).toBe('child');
  });

  it('throws when the subgraph is missing', async () => {
    await expect(useCase.execute('u1', 'missing')).rejects.toBeInstanceOf(SubgraphNotFoundError);
    expect(repo.loaded).toBeNull();
  });
});
