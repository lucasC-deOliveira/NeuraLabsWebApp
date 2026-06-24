import type { DeckCards, DeckQuery } from '../../domain/ports/deck-query';

/**
 * Returns a deck's title and cards for studying, or null when not owned.
 * @example getDeckForStudy.execute('u1', 'b1') // → DeckCards | null
 */
export class GetDeckForStudyUseCase {
  constructor(private readonly decks: DeckQuery) {}

  execute(userId: string, baralhoId: string): Promise<DeckCards | null> {
    return this.decks.findDeckForStudy(userId, baralhoId);
  }
}
