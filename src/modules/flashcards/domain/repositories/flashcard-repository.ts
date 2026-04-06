import { Flashcard } from "../entities/flashcard";

export interface FlashcardRepository {
  save(flashcard: Flashcard): Promise<void>;
  findById(id: string): Promise<Flashcard | null>;
  findAllByUserId(userId: string, options?: { conceptId?: string; topicId?: string }): Promise<Flashcard[]>;
  delete(id: string): Promise<void>;
}
