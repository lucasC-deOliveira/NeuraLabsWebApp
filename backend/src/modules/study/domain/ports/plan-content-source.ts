import type { StudyCardView } from './study-card-query';
import type { PlanQuestion } from './roadmap-questions-query';

// Conteúdo curado do plano: cards dos baralhos e questões das provas escolhidas, mais
// o conjunto de itens a excluir (dos conceitos excluídos). Vazio nas fontes = o
// StartPlannedSession cai no conteúdo do roadmap.
export interface PlanContentSource {
  dueCardsFromBaralhos(userId: string, baralhoIds: string[]): Promise<StudyCardView[]>;
  newCardsFromBaralhos(
    userId: string,
    baralhoIds: string[],
    limit: number,
  ): Promise<StudyCardView[]>;
  questionsFromProvas(userId: string, provaIds: string[], limit: number): Promise<PlanQuestion[]>;
  // Ids de flashcard/questão ligados aos conceitos excluídos (para filtrar o pool).
  excludedEntityIds(
    userId: string,
    conceitoIds: string[],
  ): Promise<{ flashcards: Set<string>; questions: Set<string> }>;
}

export const PLAN_CONTENT_SOURCE = Symbol('PLAN_CONTENT_SOURCE');
