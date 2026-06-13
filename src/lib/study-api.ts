// Fluxo de estudo (sessão + revisão SRS) → API NestJS.
import { apiFetch } from "./api";
import type { FlashcardData } from "@/types";

export function startStudySession(): Promise<{ sessionId: string; cards: FlashcardData[] }> {
  return apiFetch("/study/session", { method: "POST" });
}

export function submitCardReview(data: {
  flashcardId: string;
  respostaUsuario: string;
  acertou: boolean;
  nivelConfianca: number;
  tipoErro?: string;
  tempoResposta?: number;
  sessaoId?: string;
}): Promise<{ success: boolean }> {
  return apiFetch("/study/review", { method: "POST", body: JSON.stringify(data) });
}

export function endStudySession(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch(`/study/session/${sessionId}/end`, { method: "POST" });
}

export function startDeckStudy(baralhoId: string): Promise<{
  sessionId: string;
  titulo: string;
  cards: FlashcardData[];
  totalNoDeck: number;
} | null> {
  return apiFetch(`/study/deck/${baralhoId}`, { method: "POST" });
}

export function getFlashcardForStudy(flashcardId: string): Promise<{
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
  due: boolean;
  proximaRevisao: string | null;
} | null> {
  return apiFetch(`/study/flashcard/${flashcardId}`);
}

export function startSingleCardStudy(flashcardId: string): Promise<{
  sessionId: string | null;
  card: { id: string; pergunta: string; resposta: string; conceito: string | null };
  due: boolean;
  proximaRevisao: string | null;
} | null> {
  return apiFetch(`/study/flashcard/${flashcardId}/start`, { method: "POST" });
}

export function finalizeStudySession(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch(`/study/session/${sessionId}/finalize`, { method: "POST" });
}
