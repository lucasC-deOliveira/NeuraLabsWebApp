import type { Flashcard } from '../entities/flashcard';

// Persistence port for the Flashcard aggregate (card + its learning state).
export interface FlashcardRepository {
  findOwnedBy(flashcardId: string, userId: string): Promise<Flashcard | null>;
  save(flashcard: Flashcard): Promise<void>;
}

export const FLASHCARD_REPOSITORY = Symbol('FLASHCARD_REPOSITORY');
