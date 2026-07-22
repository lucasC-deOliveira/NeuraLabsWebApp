// Read port for study analytics: raw rows the domain services aggregate. Only the
// adapter knows Prisma; the derivations stay pure and testable.

export interface LearningStateRow {
  fase: string;
  intervalo: number;
  proximaRevisao: Date;
}

export interface ReviewRow {
  data: Date; // vem da sessão (a revisão não tem timestamp próprio)
  acertou: boolean;
  nivelConfianca: number;
  tempoResposta: number | null;
  tipoErro: string | null;
}

// Estatística por carta (vida toda) para os cartões-problema (leeches).
export interface ProblemCardRow {
  pergunta: string;
  total: number;
  wrong: number;
}

export interface FlashcardAnalyticsSource {
  // Estado SM-2 de cada carta do usuário (forecast + maturidade).
  learningStates(userId: string): Promise<LearningStateRow[]>;
  // Revisões do usuário a partir de `since` (tendências, velocidade, perfil, erros).
  reviewsSince(userId: string, since: Date): Promise<ReviewRow[]>;
  // Cartas com pelo menos um erro (vida toda), para ranquear os problemáticos.
  problemCardStats(userId: string): Promise<ProblemCardRow[]>;
}

export const FLASHCARD_ANALYTICS_SOURCE = Symbol('FLASHCARD_ANALYTICS_SOURCE');
