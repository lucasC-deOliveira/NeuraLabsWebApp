// Números do dia do plano, agregados do banco num lugar só: o backlog escopado, a
// estimativa de tempo e o ritmo/restante do roadmap. Mantém o use-case testável.
export interface PlanContext {
  dueReviews: number; // cards de flashcard vencidos
  dueFeynman: number; // re-explicações Feynman vencidas
  avgSecondsPerCard: number; // estimativa p/ converter tempo↔nº (fallback no adapter)
  remainingConcepts: number; // conceitos da trilha ainda não estudados
}

export interface PlanContextQuery {
  load(userId: string, grafoId: string, prioridade: string): Promise<PlanContext>;
}

export const PLAN_CONTEXT_QUERY = Symbol('PLAN_CONTEXT_QUERY');
