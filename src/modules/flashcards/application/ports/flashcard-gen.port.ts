// Port for the "generate from note" flow. The infra/ adapter implements it over
// @/lib/notes-api (list), @/lib/content-api (preview/save) and @/lib/ai-api (IA).
import type { FlashcardPreview, NotaForGen } from "../../domain/flashcard-source.types";

export interface FlashcardGenPort {
  listNotas(): Promise<NotaForGen[]>;
  previewFromNota(notaId: string): Promise<FlashcardPreview[]>;
  generateViaIA(notaId: string): Promise<FlashcardPreview[]>;
  savePreviews(
    notaId: string,
    cards: Array<{ pergunta: string; resposta: string; conceitoId: string }>,
  ): Promise<{ count: number }>;
}
