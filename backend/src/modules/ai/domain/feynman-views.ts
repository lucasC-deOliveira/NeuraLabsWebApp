// Feedback da IA sobre uma explicação pela Técnica Feynman.
export interface FeynmanGap {
  ponto: string; // o ponto-chave que faltou
  conceitoId: string | null; // conceito do grafo a revisar (quando mapeável)
}

export interface FeynmanFeedback {
  clareza: number; // 0-100 (o quão simples/clara ficou)
  jargao: string[]; // termos técnicos usados sem explicar
  lacunas: FeynmanGap[]; // pontos que faltaram → conceitos
  analogia: string; // analogia sugerida ('' se nenhuma)
  reescrita: string; // versão reescrita 'para iniciante' ('' se nenhuma)
}
