// Projeção de término do plano. Puro: conceitos restantes ÷ ritmo → data projetada;
// contra a data-alvo (quando há) → on-track + quantos/dia bateriam o prazo.

const MS_PER_DAY = 86_400_000;

export interface ProjectionInput {
  remainingConcepts: number;
  avgNewPerDay: number; // ritmo recente (conceitos/dia)
  today: Date;
  dataAlvo?: Date | null; // null = sem prazo ("completar tudo")
}

export interface Projection {
  projectedFinish: Date | null; // null quando o ritmo é 0 (desconhecido)
  daysNeeded: number | null;
  onTrack: boolean | null; // vs dataAlvo; null sem data ou sem ritmo
  suggestedPerDay: number | null; // p/ bater a dataAlvo; null sem data
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function daysUntil(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
}

// Nº/dia que bate a data-alvo (null quando não há data). Piso de 1 dia evita ÷0.
function suggestedPerDay(remaining: number, today: Date, dataAlvo?: Date | null): number | null {
  if (!dataAlvo) return null;
  return Math.ceil(remaining / Math.max(1, daysUntil(today, dataAlvo)));
}

/**
 * Projeta o término do plano e, havendo data-alvo, se o ritmo atual a alcança.
 * @example projectCompletion({ remainingConcepts: 68, avgNewPerDay: 4, today, dataAlvo })
 */
export function projectCompletion(input: ProjectionInput): Projection {
  const { remainingConcepts, avgNewPerDay, today, dataAlvo } = input;
  const suggested = suggestedPerDay(remainingConcepts, today, dataAlvo);
  if (remainingConcepts <= 0) {
    return { projectedFinish: today, daysNeeded: 0, onTrack: true, suggestedPerDay: 0 };
  }
  if (avgNewPerDay <= 0) {
    return { projectedFinish: null, daysNeeded: null, onTrack: null, suggestedPerDay: suggested };
  }
  const daysNeeded = Math.ceil(remainingConcepts / avgNewPerDay);
  const projectedFinish = addDays(today, daysNeeded);
  const onTrack = dataAlvo ? projectedFinish.getTime() <= dataAlvo.getTime() : null;
  return { projectedFinish, daysNeeded, onTrack, suggestedPerDay: suggested };
}
