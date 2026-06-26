import type { CreateFlashcardInput, PreviewCard, UpdateFlashcardPatch } from '../flashcard-views';

export interface ConceitoRef {
  id: string;
  nome: string;
}

// Write port + the reads needed to preview rule-based flashcards from a note.
export interface FlashcardRepository {
  create(userId: string, input: CreateFlashcardInput): Promise<string>;
  update(userId: string, id: string, patch: UpdateFlashcardPatch): Promise<void>;
  delete(userId: string, id: string): Promise<void>;
  deleteAllWithGraph(userId: string): Promise<number>;
  saveMany(userId: string, cards: PreviewCard[]): Promise<number>;
  loadNotaContent(userId: string, notaId: string): Promise<{ conteudo: string } | null>;
  loadConcepts(userId: string): Promise<ConceitoRef[]>;
}

export const FLASHCARD_REPOSITORY = Symbol('FLASHCARD_REPOSITORY');
