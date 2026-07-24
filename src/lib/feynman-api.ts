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
