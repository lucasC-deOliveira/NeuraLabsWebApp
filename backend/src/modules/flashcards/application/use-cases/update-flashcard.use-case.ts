import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';
import type { UpdateFlashcardPatch } from '../../domain/flashcard-views';

/**
 * Updates one of the user's flashcards (no-op if it isn't theirs).
 * @example updateFlashcard.execute('u1', 'f1', { resposta })
 */
export class UpdateFlashcardUseCase {
  constructor(private readonly repo: FlashcardRepository) {}

  async execute(
    userId: string,
    id: string,
    patch: UpdateFlashcardPatch,
  ): Promise<{ success: boolean }> {
    await this.repo.update(userId, id, patch);
    return { success: true };
  }
}
