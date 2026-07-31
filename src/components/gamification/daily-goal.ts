// Progresso da meta diária: revisões feitas hoje contra o alvo do usuário. Puro e
// testável. A meta mede o hábito — o alvo é do aparelho (preferência), o "feito"
// vem do backend (revisões de hoje).

export interface DailyGoalProgress {
  done: number;
  goal: number;
  // 0..1, grampeado (passar da meta não estoura o anel).
  pct: number;
  met: boolean;
  remaining: number;
}

export const MIN_DAILY_GOAL = 5;
export const MAX_DAILY_GOAL = 500;
export const DEFAULT_DAILY_GOAL = 20;

/** Grampeia o alvo na faixa sensata — um valor estranho não deve quebrar o anel. */
export function clampDailyGoal(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DAILY_GOAL;
  return Math.min(MAX_DAILY_GOAL, Math.max(MIN_DAILY_GOAL, Math.round(value)));
}

/**
 * Progresso do dia a partir do feito e do alvo.
 * @example dailyGoalProgress(12, 20) // → { done:12, goal:20, pct:0.6, met:false, remaining:8 }
 */
export function dailyGoalProgress(done: number, goal: number): DailyGoalProgress {
  const safeGoal = clampDailyGoal(goal);
  const safeDone = Math.max(0, Math.floor(done));
  return {
    done: safeDone,
    goal: safeGoal,
    pct: Math.min(1, safeDone / safeGoal),
    met: safeDone >= safeGoal,
    remaining: Math.max(0, safeGoal - safeDone),
  };
}
