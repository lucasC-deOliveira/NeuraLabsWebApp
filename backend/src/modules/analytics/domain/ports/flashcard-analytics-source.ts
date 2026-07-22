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
}

export interface FlashcardAnalyticsSource {
  // Estado SM-2 de cada carta do usuário (forecast + maturidade).
  learningStates(userId: string): Promise<LearningStateRow[]>;
  // Revisões do usuário a partir de `since` (tendências, velocidade, perfil).
  reviewsSince(userId: string, since: Date): Promise<ReviewRow[]>;
}

export const FLASHCARD_ANALYTICS_SOURCE = Symbol('FLASHCARD_ANALYTICS_SOURCE');
