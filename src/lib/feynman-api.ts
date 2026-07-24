// Borda HTTP da Técnica Feynman (só a camada de UI compartilhada a usa).
import { apiFetch } from "./api";
import type {
  FeynmanAlvoTipo,
  FeynmanAngulo,
  FeynmanFeedback,
} from "@/components/feynman/feynman.types";

// Avalia uma explicação Feynman sob um ângulo (a IA leva alguns segundos).
export function gradeFeynman(
  alvoTipo: FeynmanAlvoTipo,
  alvoId: string,
  texto: string,
  angulo: FeynmanAngulo,
): Promise<FeynmanFeedback> {
  return apiFetch<FeynmanFeedback>("/feynman/grade", {
    method: "POST",
    body: JSON.stringify({ alvoTipo, alvoId, texto, angulo }),
    timeoutMs: 60_000,
  });
}

// Uma explicação avaliada, por ângulo, pronta para salvar na sessão.
export interface FeynmanSessionExplanation {
  angulo: FeynmanAngulo;
  texto: string;
  clareza: number;
  lacunas: FeynmanFeedback["lacunas"];
  jargao: FeynmanFeedback["jargao"];
}

// Persiste a sessão (1 a 3 ângulos): histórico + agendamento + nota combinada no grafo.
export function saveFeynmanSession(
  alvoTipo: FeynmanAlvoTipo,
  alvoId: string,
  explicacoes: FeynmanSessionExplanation[],
): Promise<void> {
  return apiFetch<void>("/feynman/sessions", {
    method: "POST",
    body: JSON.stringify({ alvoTipo, alvoId, explicacoes }),
  });
}
