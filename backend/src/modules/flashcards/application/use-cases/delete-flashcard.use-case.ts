import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';

/**
 * Deletes one of the user's flashcards (no-op if it isn't theirs).
 * @example deleteFlashcard.execute('u1', 'f1')
 */
export class DeleteFlashcardUseCase {
  constructor(private readonly repo: FlashcardRepository) {}

  async execute(userId: string, id: string): Promise<{ success: boolean }> {
    await this.repo.delete(userId, id);
    return { success: true };
  }
}
