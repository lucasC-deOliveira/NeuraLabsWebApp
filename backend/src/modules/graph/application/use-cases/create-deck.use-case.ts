import { FlashcardsNotOwnedError, GraphNotFoundError } from '../../domain/errors';
import { normalizeDeckCreation } from '../../domain/services/deck-creation';
import type { CreateDeckRepository } from '../../domain/ports/create-deck-repository';

/**
 * Creates a deck (Baralho) in a graph from owned flashcards, linking each with a
 * CONTEM edge.
 * @example createDeck.execute('u1', 'g1', 'Bio', ['f1', 'f2'])
 */
export class CreateDeckUseCase {
  constructor(private readonly decks: CreateDeckRepository) {}

  async execute(
    userId: string,
    grafoId: string,
    titulo: string,
    flashcardIds: string[],
  ): Promise<{ success: boolean; nodeId: string }> {
    if (!(await this.decks.graphExists(grafoId, userId))) throw new GraphNotFoundError();
    const normalized = normalizeDeckCreation(titulo, flashcardIds);
    if (
      normalized.flashcardIds.length &&
      !(await this.decks.allFlashcardsOwned(userId, normalized.flashcardIds))
    )
      throw new FlashcardsNotOwnedError();
    const nodeId = await this.decks.createDeck(
      userId,
      grafoId,
      normalized.titulo,
      normalized.flashcardIds,
    );
    return { success: true, nodeId };
  }
}
