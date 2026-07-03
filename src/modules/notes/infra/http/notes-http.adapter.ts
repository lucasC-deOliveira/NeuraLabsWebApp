// ACL over @/lib/notes-api. Only this infra adapter knows the lib boundary.
import {
  getNotas,
  getNotaById,
  createNotaManual,
  generateFlashcardsFromNota,
  deleteNota,
  deleteAllNotas,
  getNotasFilterData,
} from "@/lib/notes-api";
import type { NotesPort, CreateNotaManualInput } from "../../application/ports/notes.port";
import type { NotaListItem, NotaDetail } from "../../domain/nota.types";

export class HttpNotesAdapter implements NotesPort {
  getNotas(): Promise<NotaListItem[]> {
    return getNotas();
  }

  getNotaById(id: string): Promise<NotaDetail | null> {
    return getNotaById(id);
  }

  createNotaManual(input: CreateNotaManualInput): Promise<{ notaId: string }> {
    return createNotaManual(input);
  }

  generateFlashcards(notaId: string): Promise<{ flashcards: { id: string; pergunta: string }[] }> {
    return generateFlashcardsFromNota(notaId);
  }

  async deleteNota(id: string): Promise<void> {
    await deleteNota(id);
  }

  deleteAllNotas(): Promise<{ count: number }> {
    return deleteAllNotas();
  }

  getFilterData(): Promise<Array<{ id: string; nome: string }>> {
    return getNotasFilterData();
  }
}
