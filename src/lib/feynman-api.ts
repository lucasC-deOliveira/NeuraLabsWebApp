// Borda HTTP da Técnica Feynman (só a camada de UI compartilhada a usa).
import { apiFetch } from "./api";
import type { FeynmanAlvoTipo, FeynmanFeedback } from "@/components/feynman/feynman.types";

// Avalia uma explicação Feynman de um conceito/flashcard (a IA leva alguns segundos).
export function gradeFeynman(
  alvoTipo: FeynmanAlvoTipo,
  alvoId: string,
  texto: string,
): Promise<FeynmanFeedback> {
  return apiFetch<FeynmanFeedback>("/feynman/grade", {
    method: "POST",
    body: JSON.stringify({ alvoTipo, alvoId, texto }),
    timeoutMs: 60_000,
  });
}

// Persiste a explicação avaliada (histórico + agendamento de re-explicação).
export function saveFeynmanAttempt(
  alvoTipo: FeynmanAlvoTipo,
  alvoId: string,
  texto: string,
  feedback: FeynmanFeedback,
): Promise<void> {
  return apiFetch<void>("/feynman/attempts", {
    method: "POST",
    body: JSON.stringify({
      alvoTipo,
      alvoId,
      texto,
      clareza: feedback.clareza,
      lacunas: feedback.lacunas,
      jargao: feedback.jargao,
    }),
  });
}
