import type { GraphDeck, GraphDecksQuery } from '../../domain/ports/graph-decks-query';

/**
 * Lists the decks available in a graph (directly and via referenced subgraphs).
 * @example listBaralhos.execute('u1', 'g1')
 */
export class ListBaralhosInGrafoUseCase {
  constructor(private readonly decks: GraphDecksQuery) {}

  execute(userId: string, grafoId: string): Promise<GraphDeck[]> {
    return this.decks.listDecks(userId, grafoId);
  }
}
