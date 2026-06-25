import { describe, it, expect } from 'vitest';
import { ApplyAutoLinkUseCase } from './apply-auto-link.use-case';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';

class FakeWriter implements GraphEdgeWriter {
  readonly created: GraphEdgeInput[] = [];
  constructor(private readonly rejectPairs: Set<string> = new Set()) {}
  async createEdge(_userId: string, _grafoId: string, edge: GraphEdgeInput): Promise<void> {
    if (this.rejectPairs.has(`${edge.sourceNodeId}:${edge.targetNodeId}`)) {
      throw new Error('duplicate edge');
    }
    this.created.push(edge);
  }
}

describe('ApplyAutoLinkUseCase', () => {
  it('creates every edge and counts them', async () => {
    const writer = new FakeWriter();
    const useCase = new ApplyAutoLinkUseCase(writer);
    const res = await useCase.execute('u1', 'g1', [
      { sourceId: 'a', targetId: 'b', relacao: 'IS_A' },
      { sourceId: 'b', targetId: 'c', relacao: 'PART_OF' },
    ]);
    expect(res).toEqual({ added: 2 });
    expect(writer.created).toHaveLength(2);
    expect(writer.created[0]).toEqual({
      sourceNodeId: 'a',
      targetNodeId: 'b',
      tipoRelacao: 'IS_A',
    });
  });

  it('skips edges that the writer rejects', async () => {
    const writer = new FakeWriter(new Set(['a:b']));
    const useCase = new ApplyAutoLinkUseCase(writer);
    const res = await useCase.execute('u1', 'g1', [
      { sourceId: 'a', targetId: 'b', relacao: 'IS_A' },
      { sourceId: 'b', targetId: 'c', relacao: 'PART_OF' },
    ]);
    expect(res).toEqual({ added: 1 });
    expect(writer.created.map((e) => e.sourceNodeId)).toEqual(['b']);
  });
});
