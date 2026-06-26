import type { FilterAssunto, NotaDetail, NotaListItem } from '../note-views';

// Read port for the assembled note views (with related concepts, flashcard
// counts and filters).
export interface NotaQuery {
  listNotas(userId: string): Promise<NotaListItem[]>;
  findNotaDetail(userId: string, notaId: string): Promise<NotaDetail | null>;
  listFilterAssuntos(userId: string): Promise<FilterAssunto[]>;
}

export const NOTA_QUERY = Symbol('NOTA_QUERY');
