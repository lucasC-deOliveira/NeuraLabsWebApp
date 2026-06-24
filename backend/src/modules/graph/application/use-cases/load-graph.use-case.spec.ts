import { describe, it, expect } from 'vitest';
import { LoadGraphUseCase } from './load-graph.use-case';
import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';

const emptyView: GraphView = { nodes: [], edges: [] };

class FakeGraphViewRepository implements GraphViewRepository {
  ensuredRoot = false;
  async exists(): Promise<boolean> {
    return true;
  }
  async ensureRoot(): Promise<void> {
    this.ensuredRoot = true;
  }
  async loadView(): Promise<GraphView> {
    return emptyView;
  }
}

describe('LoadGraphUseCase', () => {
  it('ensures the root before loading the view', async () => {
    const repo = new FakeGraphViewRepository();
    const res = await new LoadGraphUseCase(repo).execute('u1', 'g1');
    expect(repo.ensuredRoot).toBe(true);
    expect(res).toBe(emptyView);
  });
});
