// Port for flashcard CRUD + the concept data the list/dialog needs. The infra/
// adapter implements it over @/lib/content-api (the flashcard slice).
import type { FlashcardItem, AssuntoOption, TipoFlashcard } from "../../domain/flashcard.types";
import type { ConceptHierarchy } from "../../domain/concept-hierarchy.types";

export interface CreateFlashcardInput {
  pergunta: string;
  resposta: string;
  conceitoId?: string | null;
  tipo?: TipoFlashcard | null;
}

export interface UpdateFlashcardInput {
  pergunta?: string;
  resposta?: string;
  tipo?: TipoFlashcard | null;
}

export interface FlashcardsPort {
  getFlashcards(): Promise<FlashcardItem[]>;
  getFilterData(): Promise<AssuntoOption[]>;
  getConceptHierarchy(): Promise<ConceptHierarchy[]>;
  createFlashcard(input: CreateFlashcardInput): Promise<{ flashcardId: string }>;
  updateFlashcard(id: string, input: UpdateFlashcardInput): Promise<void>;
  deleteFlashcard(id: string): Promise<void>;
  deleteAllFlashcards(): Promise<{ count: number }>;
}
