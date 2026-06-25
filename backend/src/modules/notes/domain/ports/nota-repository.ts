import type { CreateNotaInput, FlashcardCreated } from '../note-views';

export interface ConceitoRef {
  id: string;
  nome: string;
}

export interface NewFlashcard {
  pergunta: string;
  resposta: string;
  conceitoId: string;
}

// Write port + the reads needed for rule-based flashcard generation.
export interface NotaRepository {
  createNota(userId: string, input: CreateNotaInput): Promise<string>;
  deleteNota(userId: string, id: string): Promise<void>;
  deleteAll(userId: string): Promise<number>;
  loadNotaContent(userId: string, notaId: string): Promise<{ conteudo: string } | null>;
  loadConcepts(userId: string): Promise<ConceitoRef[]>;
  createFlashcards(userId: string, cards: NewFlashcard[]): Promise<FlashcardCreated[]>;
}

export const NOTA_REPOSITORY = Symbol('NOTA_REPOSITORY');
