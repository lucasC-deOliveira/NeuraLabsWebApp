import { describe, it, expect } from 'vitest';
import { ComposeItemIntoGraphUseCase } from './compose-item-into-graph.use-case';
import type {
  CompositionInput,
  CompositionRootType,
  CompositionSource,
} from '../../domain/ports/composition-source';
import type {
  ComposeIntoGraphRepository,
  ComposeResult,
} from '../../domain/ports/compose-into-graph-repository';
import type { CompositionGraph } from '../../domain/composition-views';

class FakeSource implements CompositionSource {
  constructor(private readonly input: CompositionInput | null) {}
  load(_u: string, _t: CompositionRootType, _i: string): Promise<CompositionInput | null> {
    return Promise.resolve(this.input);
  }
}

class SpyRepo implements ComposeIntoGraphRepository {
  public received: CompositionGraph | null = null;
  constructor(private readonly result: ComposeResult | null) {}
  compose(_u: string, _g: string, graph: CompositionGraph): Promise<ComposeResult | null> {
    this.received = graph;
    return Promise.resolve(this.result);
  }
}

const input: CompositionInput = {
  root: { id: 'f1', type: 'FLASHCARD', label: 'heap' },
  rootIsLeaf: true,
  leaves: [
    {
      id: 'f1',
      type: 'FLASHCARD',
      label: 'heap',
      chains: [
        { conceitoId: 'c1', conceito: 'Heap', topicoId: null, topico: null, assuntoId: null, assunto: null },
      ],
    },
  ],
};

describe('ComposeItemIntoGraphUseCase', () => {
  it('returns null when the item is not found (no merge attempted)', async () => {
    const repo = new SpyRepo({ nodes: 0, edges: 0 });
    const useCase = new ComposeItemIntoGraphUseCase(new FakeSource(null), repo);
    expect(await useCase.execute('u1', 'g1', 'FLASHCARD', 'missing')).toBeNull();
    expect(repo.received).toBeNull();
  });

  it('builds the composition and hands the merged subgraph to the repo', async () => {
    const repo = new SpyRepo({ nodes: 2, edges: 1 });
    const useCase = new ComposeItemIntoGraphUseCase(new FakeSource(input), repo);

    const result = await useCase.execute('u1', 'g1', 'FLASHCARD', 'f1');

    expect(result).toEqual({ nodes: 2, edges: 1 });
    expect(repo.received?.nodes.map((n) => n.id)).toEqual(['f1', 'c1']);
    expect(repo.received?.edges).toEqual([{ source: 'f1', target: 'c1', rel: 'HERDA' }]);
  });
});
