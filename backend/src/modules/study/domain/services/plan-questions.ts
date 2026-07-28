// Ordenação das questões do plano: na ordem dos conceitos do roadmap, deixando de
// fora as que o usuário JÁ ACERTOU (prática foca no que ainda não domina). Puro.

export interface RankableQuestion {
  id: string;
  conceitoId: string | null;
}

/**
 * Questões ainda não acertadas, ordenadas pela posição do conceito no roadmap.
 * @example orderPlanQuestions(qs, ['c1','c2'], new Set(['q9']))
 */
export function orderPlanQuestions<T extends RankableQuestion>(
  questions: T[],
  conceptOrder: string[],
  correct: Set<string>,
): T[] {
  const pos = new Map(conceptOrder.map((c, i) => [c, i]));
  return questions
    .filter((q) => !correct.has(q.id))
    .map((q, i) => ({ q, i, rank: pos.get(q.conceitoId ?? '') ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.q);
}
