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
