// ACL over the note-generation boundaries (notes-api list, content-api
// preview/save, ai-api IA generation).
import { getNotas } from "@/lib/notes-api";
import { previewFlashcardsFromNota, saveFlashcardPreviewsFromNota } from "@/lib/content-api";
import { generateFlashcardsViaIA } from "@/lib/ai-api";
import type { FlashcardGenPort } from "../../application/ports/flashcard-gen.port";
import type { FlashcardPreview, NotaForGen } from "../../domain/flashcard-source.types";

export class HttpFlashcardGenAdapter implements FlashcardGenPort {
  listNotas(): Promise<NotaForGen[]> {
    return getNotas();
  }

  previewFromNota(notaId: string): Promise<FlashcardPreview[]> {
    return previewFlashcardsFromNota(notaId);
  }

  generateViaIA(notaId: string): Promise<FlashcardPreview[]> {
    return generateFlashcardsViaIA(notaId);
  }

  savePreviews(
    notaId: string,
    cards: Array<{ pergunta: string; resposta: string; conceitoId: string }>,
  ): Promise<{ count: number }> {
    return saveFlashcardPreviewsFromNota(notaId, cards);
  }
}
