import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';

/**
 * Deletes all of the user's flashcards (and their graph nodes/edges), returning
 * how many were removed.
 * @example deleteAllFlashcards.execute('u1')
 */
export class DeleteAllFlashcardsUseCase {
  constructor(private readonly repo: FlashcardRepository) {}

  async execute(userId: string): Promise<{ count: number }> {
    return { count: await this.repo.deleteAllWithGraph(userId) };
  }
}
