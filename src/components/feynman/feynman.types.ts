// Espelha o feedback do backend (POST /feynman/grade).
export type FeynmanAlvoTipo = "CONCEITO" | "FLASHCARD";

export interface FeynmanGap {
  ponto: string;
  conceitoId: string | null;
}

export interface FeynmanFeedback {
  clareza: number; // 0-100
  jargao: string[];
  lacunas: FeynmanGap[];
  analogia: string;
  reescrita: string;
}
