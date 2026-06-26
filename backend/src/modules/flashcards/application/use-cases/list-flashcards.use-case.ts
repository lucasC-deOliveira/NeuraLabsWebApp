import type { FlashcardQuery } from '../../domain/ports/flashcard-query';
import type { FlashcardView, ListFlashcardsOptions } from '../../domain/flashcard-views';

/**
 * Lists the user's flashcards with hierarchy and SRS scheduling, optionally
 * filtered by concept or topic.
 * @example listFlashcards.execute('u1', { topicId })
 */
export class ListFlashcardsUseCase {
  constructor(private readonly query: FlashcardQuery) {}

  execute(userId: string, opts: ListFlashcardsOptions): Promise<FlashcardView[]> {
    return this.query.listFlashcards(userId, opts);
  }
}
