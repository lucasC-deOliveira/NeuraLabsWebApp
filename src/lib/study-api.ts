// Fluxo de estudo (sessão + revisão SRS) → API NestJS.
import { apiFetch } from "./api";
import type { FlashcardData } from "@/types";

export function startStudySession(): Promise<{ sessionId: string; cards: FlashcardData[] }> {
  return apiFetch("/study/session", { method: "POST" });
}

// Agendamento como o backend o serializa: plano, com as datas em ISO.
// `proximaRevisao` nulo = card novo (sem registro de aprendizado).
export interface ApiCardSchedule {
  fase: string;
  learningStep: number;
  dificuldade: number;
  intervalo: number;
  fatorEase: number;
  proximaRevisao: string | null;
  ultimaRevisao: string | null;
}

export type ApiDeckCard = FlashcardData & ApiCardSchedule;

export function submitCardReview(data: {
  flashcardId: string;
  grade: 'again' | 'hard' | 'good' | 'easy';
  tempoResposta?: number;
  sessaoId?: string;
}): Promise<{ success: boolean; schedule: ApiCardSchedule | null }> {
  return apiFetch("/study/review", { method: "POST", body: JSON.stringify({ ...data, respostaUsuario: "" }) });
}

export function endStudySession(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch(`/study/session/${sessionId}/end`, { method: "POST" });
}

export function startDeckStudy(baralhoId: string): Promise<{
  sessionId: string;
  titulo: string;
  cards: ApiDeckCard[];
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

export function startSingleCardStudy(flashcardId: string): Promise<
  ({
    sessionId: string | null;
    card: { id: string; pergunta: string; resposta: string; conceito: string | null };
    due: boolean;
  } & ApiCardSchedule) | null
> {
  return apiFetch(`/study/flashcard/${flashcardId}/start`, { method: "POST" });
}

export function finalizeStudySession(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch(`/study/session/${sessionId}/finalize`, { method: "POST" });
}

export function syncVaultSessions(
  sessions: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    baralhoId: string | null;
    revisoes: Array<{
      flashcardId: string;
      grade: 'again' | 'hard' | 'good' | 'easy';
      tempoResposta: number;
      revisadoEm: string;
    }>;
  }>,
): Promise<{ synced: number }> {
  return apiFetch("/study/sync-vault-log", { method: "POST", body: JSON.stringify({ sessions }) });
}
