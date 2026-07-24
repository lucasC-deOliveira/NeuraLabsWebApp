import type { QuestaoAnswerRow } from '../ports/questao-item-source';
import type { AlternativeShare, QuestaoAttemptPoint } from '../questao-item-views';
import { dateKey } from './date-key';

export interface AnswerTotals {
  respostas: number;
  wrong: number;
  accuracy: number | null; // 0-100; null sem respostas
}

// Total de respostas, erros e acurácia daquela questão.
export function answerTotals(rows: QuestaoAnswerRow[]): AnswerTotals {
  const total = rows.length;
  if (total === 0) return { respostas: 0, wrong: 0, accuracy: null };
  const correct = rows.filter((r) => r.acertou).length;
  return {
    respostas: total,
    wrong: total - correct,
    accuracy: Math.round((correct / total) * 100),
  };
}

// Histórico cronológico: uma marca por resposta (data + acertou).
export function attemptHistory(rows: QuestaoAnswerRow[]): QuestaoAttemptPoint[] {
  return [...rows]
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .map((r) => ({ date: dateKey(r.data), acertou: r.acertou }));
}

// Distribuição das alternativas escolhidas; marca o gabarito e ordena por frequência.
export function alternativeShares(rows: QuestaoAnswerRow[], gabarito: string): AlternativeShare[] {
  const total = rows.length;
  if (total === 0) return [];
  const byOption = new Map<string, number>();
  for (const row of rows) byOption.set(row.escolhida, (byOption.get(row.escolhida) ?? 0) + 1);
  return [...byOption.entries()]
    .map(([opcao, count]) => ({
      opcao,
      count,
      pct: Math.round((count / total) * 100),
      correta: opcao === gabarito,
    }))
    .sort((a, b) => b.count - a.count);
}
