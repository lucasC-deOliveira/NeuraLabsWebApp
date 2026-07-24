export interface FeynmanSchedule {
  intervalo: number; // dias até re-explicar
  proximaRevisao: Date;
}

const MAX_INTERVAL = 180;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

// Próximo intervalo (dias) por clareza (SM-2-lite): explicação ruim volta logo,
// boa espaça. Clareza <40 → amanhã; 40-69 → cresce devagar; ≥70 → espaça bastante.
function computeInterval(clareza: number, intervaloAtual: number): number {
  if (clareza < 40) return 1;
  if (clareza < 70)
    return Math.min(MAX_INTERVAL, intervaloAtual < 1 ? 3 : Math.round(intervaloAtual * 1.5));
  return Math.min(MAX_INTERVAL, intervaloAtual < 1 ? 7 : Math.round(intervaloAtual * 2.2));
}

// Agenda a próxima re-explicação a partir da clareza e do intervalo atual.
export function nextFeynmanReview(
  clareza: number,
  intervaloAtual: number,
  now: Date,
): FeynmanSchedule {
  const intervalo = computeInterval(clareza, intervaloAtual);
  return { intervalo, proximaRevisao: addDays(now, intervalo) };
}
