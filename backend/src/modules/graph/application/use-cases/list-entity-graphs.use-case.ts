import type { EntityGraphRef, EntityGraphsQuery } from '../../domain/ports/entity-graphs-query';

/**
 * Lista os grafos que mostram uma entidade, para o "Ver no grafo" navegar até ela.
 * @example listEntityGraphs.execute('u1', 'FLASHCARD', 'fc1') // → [{ grafoId, nome }]
 */
export class ListEntityGraphsUseCase {
  constructor(private readonly query: EntityGraphsQuery) {}

  execute(userId: string, tipoNode: string, referenciaId: string): Promise<EntityGraphRef[]> {
    return this.query.graphsContaining(userId, tipoNode, referenciaId);
  }
}
