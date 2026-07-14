import { describe, it, expect } from 'vitest';
import { LoadGraphUseCase } from './load-graph.use-case';
import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';
import type {
  CachedGraphView,
  GraphViewCacheRepository,
} from '../../domain/ports/graph-view-cache-repository';

const emptyView: GraphView = { nodes: [], edges: [] };

class FakeGraphViewRepository implements GraphViewRepository {
  builds = 0;
  async exists(): Promise<boolean> {
    return true;
  }
  async loadView(): Promise<GraphView> {
    this.builds++;
    return { nodes: [], edges: [] };
  }
}

class FakeGraphViewCache implements GraphViewCacheRepository {
  entry: CachedGraphView | null = null;
  saved: CachedGraphView | null = null;
  constructor(private readonly signature: string) {}
  async currentSignature(): Promise<string> {
    return this.signature;
  }
  async load(): Promise<CachedGraphView | null> {
    return this.entry;
  }
  async save(_u: string, _g: string, assinatura: string, view: GraphView): Promise<void> {
    this.saved = { assinatura, view };
  }
}

describe('LoadGraphUseCase', () => {
  it('builds and caches the view on a miss', async () => {
    const view = new FakeGraphViewRepository();
    const cache = new FakeGraphViewCache('sig-1');
    const res = await new LoadGraphUseCase(view, cache).execute('u1', 'g1');
    expect(view.builds).toBe(1);
    expect(cache.saved?.assinatura).toBe('sig-1');
    expect(res).toEqual(emptyView);
  });

  it('serves the cache when the signature matches, skipping the build', async () => {
    const view = new FakeGraphViewRepository();
    const cache = new FakeGraphViewCache('sig-1');
    cache.entry = { assinatura: 'sig-1', view: emptyView };
    const res = await new LoadGraphUseCase(view, cache).execute('u1', 'g1');
    expect(view.builds).toBe(0);
    expect(res).toBe(emptyView);
  });

  it('rebuilds when the signature changed (stale cache)', async () => {
    const view = new FakeGraphViewRepository();
    const cache = new FakeGraphViewCache('sig-2');
    cache.entry = { assinatura: 'sig-1', view: emptyView };
    await new LoadGraphUseCase(view, cache).execute('u1', 'g1');
    expect(view.builds).toBe(1);
    expect(cache.saved?.assinatura).toBe('sig-2');
  });
});
