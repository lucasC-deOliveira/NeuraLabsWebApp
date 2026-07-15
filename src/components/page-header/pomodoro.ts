// Regras do timer pomodoro do header (o "tomate" do app disrupt): 25 min de foco,
// 5 de descanso, alternando sozinho. Lógica pura — o estado e o intervalo vivem no
// PomodoroProvider.

export type PomodoroCycle = "work" | "rest";

export const WORK_SECONDS = 25 * 60;
export const REST_SECONDS = 5 * 60;

/** Duração cheia de um ciclo, em segundos. */
export function cycleSeconds(cycle: PomodoroCycle): number {
  return cycle === "work" ? WORK_SECONDS : REST_SECONDS;
}

/** O ciclo seguinte: foco e descanso se revezam. */
export function nextCycle(cycle: PomodoroCycle): PomodoroCycle {
  return cycle === "work" ? "rest" : "work";
}

export const CYCLE_LABELS: Record<PomodoroCycle, string> = {
  work: "Foco",
  rest: "Descanso",
};

/**
 * Formata os segundos restantes como mm:ss. Nunca mostra tempo negativo — o zero é
 * o instante da virada de ciclo.
 * @example formatTime(1500) // "25:00"
 */
export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export interface PomodoroTick {
  cycle: PomodoroCycle;
  secondsLeft: number;
}

/**
 * Um segundo de relógio: desconta e, ao chegar a zero, vira o ciclo já com a
 * duração cheia do próximo.
 * @example tick({ cycle: "work", secondsLeft: 1 }) // { cycle: "rest", secondsLeft: 300 }
 */
export function tick(state: PomodoroTick): PomodoroTick {
  const secondsLeft = state.secondsLeft - 1;
  if (secondsLeft > 0) return { cycle: state.cycle, secondsLeft };
  const cycle = nextCycle(state.cycle);
  return { cycle, secondsLeft: cycleSeconds(cycle) };
}
