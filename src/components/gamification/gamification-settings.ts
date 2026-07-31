// Preferências de gamificação no localStorage — do aparelho, como as do estudo.
// Por ora só a meta diária de revisões; o alvo do anel de progresso.
import { clampDailyGoal, DEFAULT_DAILY_GOAL } from "./daily-goal";

const GOAL_KEY = "neuralabs.daily-goal";
// Uma vez por dia: guarda o dia (YYYY-MM-DD) em que a meta já foi celebrada, para
// a comemoração não repetir a cada recarga.
const CELEBRATED_KEY = "neuralabs.daily-goal-celebrated";

export function loadDailyGoal(): number {
  try {
    const saved = localStorage.getItem(GOAL_KEY);
    return saved ? clampDailyGoal(Number(saved)) : DEFAULT_DAILY_GOAL;
  } catch {
    return DEFAULT_DAILY_GOAL;
  }
}

export function saveDailyGoal(goal: number): void {
  try {
    localStorage.setItem(GOAL_KEY, String(clampDailyGoal(goal)));
  } catch {
    // sem onde guardar (modo privado): vale só para esta sessão.
  }
}

/** Já celebramos a meta HOJE? (dateKey no fuso local). */
export function alreadyCelebratedToday(today: string): boolean {
  try {
    return localStorage.getItem(CELEBRATED_KEY) === today;
  } catch {
    return false;
  }
}

export function markCelebratedToday(today: string): void {
  try {
    localStorage.setItem(CELEBRATED_KEY, today);
  } catch {
    // sem persistência: pode comemorar de novo nesta sessão — inofensivo.
  }
}

/** dateKey local YYYY-MM-DD (mesma convenção do backend, mas no fuso do aparelho). */
export function localDateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
