// Read model for a single flashcard's study status. Fields mirror the API
// response shown to the user (Portuguese) — a query projection, not an aggregate.
export interface FlashcardStudyView {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
  due: boolean;
  proximaRevisao: string | null;
  fase: string;
}

// Read port: look up one card's study status for a user.
export interface StudyFlashcardQuery {
  findForStudy(userId: string, flashcardId: string): Promise<FlashcardStudyView | null>;
}

export const STUDY_FLASHCARD_QUERY = Symbol('STUDY_FLASHCARD_QUERY');
