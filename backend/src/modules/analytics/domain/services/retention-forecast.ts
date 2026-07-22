import { addDays, dateKey } from './date-key';
import type { LearningStateRow } from '../ports/flashcard-analytics-source';
import type { RetentionDay } from '../analytics-views';

// Cartas por dia de vencimento nos próximos `days`. Atrasadas (proximaRevisao no
// passado) contam em hoje (índice 0); além da janela são ignoradas. Série contínua
// (dias sem carta aparecem com count 0) para o gráfico não ter buracos.
export function retentionForecast(
  states: LearningStateRow[],
  now: Date,
  days = 30,
): RetentionDay[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) buckets.set(dateKey(addDays(now, i)), 0);
  const today = dateKey(now);
  const last = dateKey(addDays(now, days - 1));
  for (const state of states) {
    const key = bucketKey(dateKey(state.proximaRevisao), today, last);
    if (key) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets].map(([date, count]) => ({ date, count }));
}

// Encaixa a data de vencimento na janela: atrasada → hoje; além → fora ("").
function bucketKey(due: string, today: string, last: string): string {
  if (due < today) return today;
  return due <= last ? due : '';
}
