import { describe, it, expect } from 'vitest';
import { GetItemCompositionUseCase } from './get-item-composition.use-case';
import type {
  CompositionInput,
  CompositionRootType,
  CompositionSource,
} from '../../domain/ports/composition-source';

class FakeCompositionSource implements CompositionSource {
  constructor(private readonly input: CompositionInput | null) {}
  load(_userId: string, _tipo: CompositionRootType, _id: string): Promise<CompositionInput | null> {
    return Promise.resolve(this.input);
  }
}

describe('GetItemCompositionUseCase', () => {
  it('returns null when the source has no item', async () => {
    const useCase = new GetItemCompositionUseCase(new FakeCompositionSource(null));
    expect(await useCase.execute('u1', 'FLASHCARD', 'missing')).toBeNull();
  });

  it('builds the composed subgraph from the loaded input', async () => {
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
    const useCase = new GetItemCompositionUseCase(new FakeCompositionSource(input));

    const graph = await useCase.execute('u1', 'FLASHCARD', 'f1');

    expect(graph?.nodes.map((n) => n.id)).toEqual(['f1', 'c1']);
    expect(graph?.edges).toEqual([{ source: 'f1', target: 'c1', rel: 'HERDA' }]);
  });
});
