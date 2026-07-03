// Port for the standalone study-session flow. The infra/ adapter implements it
// over @/lib/study-api (ACL); tests mock the boundary.
import type { FlashcardData } from "@/types";
import type { Grade } from "../../domain/study-grade";

export interface StudySessionStart {
  sessionId: string;
  cards: FlashcardData[];
}

export interface CardReviewInput {
  flashcardId: string;
  grade: Grade;
  tempoResposta?: number;
}

export interface StudySessionPort {
  start(): Promise<StudySessionStart>;
  submitReview(input: CardReviewInput): Promise<void>;
  end(sessionId: string): Promise<void>;
}
