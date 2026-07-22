import { dateKey } from './date-key';
import type { AttemptRow } from '../ports/prova-analytics-source';
import type { ProvaProgress } from '../prova-analytics-views';

// Curva de score por prova ao longo das tentativas (retakes). Uma série por prova,
// pontos em ordem cronológica. Provas ordenadas por nº de tentativas (mais refeitas
// primeiro) — são as com progresso mais interessante.
export function scoreProgression(attempts: AttemptRow[]): ProvaProgress[] {
  const byProva = new Map<string, ProvaProgress>();
  for (const attempt of attempts) {
    const prova = byProva.get(attempt.provaId) ?? {
      provaId: attempt.provaId,
      titulo: attempt.titulo,
      points: [],
    };
    const scorePct = attempt.total > 0 ? Math.round((attempt.acertos / attempt.total) * 100) : 0;
    prova.points.push({ date: dateKey(attempt.dataFim), scorePct });
    byProva.set(attempt.provaId, prova);
  }
  for (const prova of byProva.values()) {
    prova.points.sort((a, b) => a.date.localeCompare(b.date));
  }
  return [...byProva.values()].sort((a, b) => b.points.length - a.points.length);
}
