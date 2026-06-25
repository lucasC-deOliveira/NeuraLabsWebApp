export interface ConceptRef {
  id: string;
  nome: string;
}

// Read port for AI flashcard generation: the source note's content and the
// user's concepts (to attach each card to one).
export interface FlashcardSourceRepository {
  loadNote(userId: string, notaId: string): Promise<{ conteudo: string } | null>;
  loadConcepts(userId: string): Promise<ConceptRef[]>;
}

export const FLASHCARD_SOURCE_REPOSITORY = Symbol('FLASHCARD_SOURCE_REPOSITORY');
