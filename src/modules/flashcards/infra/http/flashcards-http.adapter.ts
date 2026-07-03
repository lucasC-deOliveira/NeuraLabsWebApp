// ACL over @/lib/content-api (the flashcard slice). Only this infra adapter
// knows the lib boundary.
import {
  getFlashcards,
  getFlashcardFilterData,
  getConceptHierarchy,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  deleteAllFlashcards,
} from "@/lib/content-api";
import type {
  FlashcardsPort, CreateFlashcardInput, UpdateFlashcardInput,
} from "../../application/ports/flashcards.port";
import type { FlashcardItem, AssuntoOption } from "../../domain/flashcard.types";
import type { ConceptHierarchy } from "../../domain/concept-hierarchy.types";

export class HttpFlashcardsAdapter implements FlashcardsPort {
  getFlashcards(): Promise<FlashcardItem[]> {
    return getFlashcards();
  }

  getFilterData(): Promise<AssuntoOption[]> {
    return getFlashcardFilterData();
  }

  getConceptHierarchy(): Promise<ConceptHierarchy[]> {
    return getConceptHierarchy();
  }

  createFlashcard(input: CreateFlashcardInput): Promise<{ flashcardId: string }> {
    return createFlashcard(input);
  }

  async updateFlashcard(id: string, input: UpdateFlashcardInput): Promise<void> {
    await updateFlashcard(id, input);
  }

  async deleteFlashcard(id: string): Promise<void> {
    await deleteFlashcard(id);
  }

  deleteAllFlashcards(): Promise<{ count: number }> {
    return deleteAllFlashcards();
  }
}
