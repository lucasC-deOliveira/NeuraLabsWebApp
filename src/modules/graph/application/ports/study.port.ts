// Port (application boundary) for the study-session flow over the HTTP edge.
// Only infra/ implements it (ACL over @/lib/study-api). No React, no @/lib here.

export type StudyGrade = "again" | "hard" | "good" | "easy";

export interface StudyCard {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
}

export interface SingleCardStudy {
  sessionId: string | null;
  card: StudyCard;
  due: boolean;
  proximaRevisao: string | null;
}

export interface DeckStudySession {
  sessionId: string;
  titulo: string;
  cards: StudyCard[];
  totalNoDeck: number;
}

export interface CardReviewInput {
  flashcardId: string;
  grade: StudyGrade;
  tempoResposta?: number;
  sessaoId?: string;
}

export interface StudyPort {
  startSingleCardStudy(flashcardId: string): Promise<SingleCardStudy | null>;
  startDeckStudy(baralhoId: string): Promise<DeckStudySession | null>;
  submitCardReview(input: CardReviewInput): Promise<{ success: boolean }>;
  finalizeStudySession(sessionId: string): Promise<{ success: boolean }>;
}
