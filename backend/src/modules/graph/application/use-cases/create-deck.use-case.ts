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
    const { titulo: name, flashcardIds: ids } = normalizeDeckCreation(titulo, flashcardIds);
    await this.assertFlashcardsOwned(userId, ids);
    const nodeId = await this.decks.createDeck(userId, grafoId, name, ids);
    return { success: true, nodeId };
  }

  private async assertFlashcardsOwned(userId: string, flashcardIds: string[]): Promise<void> {
    if (flashcardIds.length && !(await this.decks.allFlashcardsOwned(userId, flashcardIds)))
      throw new FlashcardsNotOwnedError();
  }
}
