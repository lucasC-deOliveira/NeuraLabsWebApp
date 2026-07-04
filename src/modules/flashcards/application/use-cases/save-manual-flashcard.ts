// Creates any staged concepts (shared content use-case), resolves the selected
// concept id, then creates the flashcard. Ports only.
import { persistStagedConcepts, type ContentPort, type StagedConcepts } from "@/modules/content";
import type { FlashcardsPort } from "../ports/flashcards.port";
import type { ManualCardType, CardContent } from "../../domain/manual-card";

const PENDING_PREFIX = "pending:";

export interface ManualFlashcardDraft {
  selectedConceptId: string;
  tipo: ManualCardType;
  card: CardContent;
  staged: StagedConcepts;
}

export interface ManualFlashcardPorts {
  content: ContentPort;
  flashcards: FlashcardsPort;
}

/**
 * Persists staged concepts, resolves the chosen concept (existing id or a freshly
 * created pending one), then creates the flashcard. Returns the created id.
 */
export async function saveManualFlashcard(ports: ManualFlashcardPorts, draft: ManualFlashcardDraft): Promise<{ flashcardId: string }> {
  const createdByTempId = await persistStagedConcepts(ports.content, draft.staged);

  let conceitoId = draft.selectedConceptId;
  if (conceitoId.startsWith(PENDING_PREFIX)) {
    const tempId = conceitoId.slice(PENDING_PREFIX.length);
    const realId = createdByTempId.get(tempId);
    if (!realId) throw new Error(`pending concept not created: "${tempId}"`);
    conceitoId = realId;
  }

  return ports.flashcards.createFlashcard({
    pergunta: draft.card.pergunta,
    resposta: draft.card.resposta,
    conceitoId,
    tipo: draft.tipo,
  });
}
