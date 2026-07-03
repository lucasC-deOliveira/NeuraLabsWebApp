// Port for note CRUD. The infra/ adapter implements it over @/lib/notes-api.
import type { NotaListItem, NotaDetail, SubtipoNota } from "../../domain/nota.types";

export interface CreateNotaManualInput {
  titulo: string;
  conteudo: string;
  subtipo?: SubtipoNota | null;
  tipoNota?: string;
  selectedConceitoIds?: string[];
  notaConceitoRels?: Array<{ conceitoId: string; tipoRelacao: string }>;
  conceitoConceitoRels?: Array<{ origemId: string; destinoId: string; tipoRelacao: string }>;
}

export interface NotesPort {
  getNotas(): Promise<NotaListItem[]>;
  getNotaById(id: string): Promise<NotaDetail | null>;
  createNotaManual(input: CreateNotaManualInput): Promise<{ notaId: string }>;
  generateFlashcards(notaId: string): Promise<{ flashcards: { id: string; pergunta: string }[] }>;
  deleteNota(id: string): Promise<void>;
  deleteAllNotas(): Promise<{ count: number }>;
  getFilterData(): Promise<Array<{ id: string; nome: string }>>;
}
