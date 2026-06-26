import type { FlashcardView, ListFlashcardsOptions } from '../flashcard-views';

// Read port for the user's flashcards with hierarchy and SRS scheduling.
export interface FlashcardQuery {
  listFlashcards(userId: string, opts: ListFlashcardsOptions): Promise<FlashcardView[]>;
}

export const FLASHCARD_QUERY = Symbol('FLASHCARD_QUERY');
