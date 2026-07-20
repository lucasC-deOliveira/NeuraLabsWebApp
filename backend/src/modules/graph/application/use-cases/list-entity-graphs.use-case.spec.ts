import { describe, it, expect } from 'vitest';
import { ListEntityGraphsUseCase } from './list-entity-graphs.use-case';
import type { EntityGraphRef, EntityGraphsQuery } from '../../domain/ports/entity-graphs-query';

class FakeEntityGraphsQuery implements EntityGraphsQuery {
  public asked: { tipo: string; refId: string } | null = null;
  constructor(private readonly rows: EntityGraphRef[]) {}
  graphsContaining(
    _userId: string,
    tipoNode: string,
    referenciaId: string,
  ): Promise<EntityGraphRef[]> {
    this.asked = { tipo: tipoNode, refId: referenciaId };
    return Promise.resolve(this.rows);
  }
}

describe('ListEntityGraphsUseCase', () => {
  it('returns the graphs that contain the entity', async () => {
    const query = new FakeEntityGraphsQuery([{ grafoId: 'g1', nome: 'Redes' }]);

    const graphs = await new ListEntityGraphsUseCase(query).execute('u1', 'FLASHCARD', 'fc1');

    expect(graphs).toEqual([{ grafoId: 'g1', nome: 'Redes' }]);
    expect(query.asked).toEqual({ tipo: 'FLASHCARD', refId: 'fc1' });
  });

  // Entidade fora de qualquer grafo: lista vazia, e a UI simplesmente não mostra o botão.
  it('returns an empty list when the entity is in no graph', async () => {
    const graphs = await new ListEntityGraphsUseCase(new FakeEntityGraphsQuery([])).execute(
      'u1',
      'NOTA',
      'n1',
    );

    expect(graphs).toEqual([]);
  });
});
