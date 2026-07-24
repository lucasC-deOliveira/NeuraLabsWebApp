// Espelha o feedback do backend (POST /feynman/grade).
export type FeynmanAlvoTipo = "CONCEITO" | "FLASHCARD";

// Os 3 ângulos da técnica: explicar o mesmo conceito de formas diferentes.
export type FeynmanAngulo = "SIMPLES" | "ANALOGIA" | "TECNICO";

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
