import type {
  FlashcardStudyView,
  StudyFlashcardQuery,
} from '../../domain/ports/study-flashcard-query';

/**
 * Returns a single card's study status (due, next review, phase), or null when
 * the card does not belong to the user.
 * @example useCase.execute(userId, flashcardId)
 */
export class GetFlashcardForStudyUseCase {
  constructor(private readonly cards: StudyFlashcardQuery) {}

  execute(userId: string, flashcardId: string): Promise<FlashcardStudyView | null> {
    return this.cards.findForStudy(userId, flashcardId);
  }
}
