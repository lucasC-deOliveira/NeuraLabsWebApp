import { describe, it, expect } from 'vitest';
import { LoadGraphUseCase } from './load-graph.use-case';
import type { GraphView, GraphViewRepository } from '../../domain/ports/graph-view-repository';

const emptyView: GraphView = { nodes: [], edges: [] };

class FakeGraphViewRepository implements GraphViewRepository {
  loadedArgs: { userId: string; grafoId: string } | null = null;
  async exists(): Promise<boolean> {
    return true;
  }
  async loadView(userId: string, grafoId: string): Promise<GraphView> {
    this.loadedArgs = { userId, grafoId };
    return emptyView;
  }
}

describe('LoadGraphUseCase', () => {
  it('loads the graph view', async () => {
    const repo = new FakeGraphViewRepository();
    const res = await new LoadGraphUseCase(repo).execute('u1', 'g1');
    expect(repo.loadedArgs).toEqual({ userId: 'u1', grafoId: 'g1' });
    expect(res).toBe(emptyView);
  });
});
