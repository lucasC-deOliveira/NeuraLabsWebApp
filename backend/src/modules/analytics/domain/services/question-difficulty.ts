import type { QuestionStatRow } from '../ports/prova-analytics-source';
import type { HardQuestion, TypeAccuracy } from '../prova-analytics-views';

// Questões mais erradas — ranqueia por nº de erros (desempate: menor acurácia),
// devolve as `limit` piores com acurácia.
export function hardestQuestions(stats: QuestionStatRow[], limit = 8): HardQuestion[] {
  return stats
    .filter((s) => s.wrong > 0)
    .map((s) => ({
      enunciado: s.enunciado,
      total: s.total,
      wrong: s.wrong,
      accuracy: Math.round(((s.total - s.wrong) / s.total) * 100),
    }))
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy)
    .slice(0, limit);
}

// Acurácia por tipo de questão (múltipla escolha × verdadeiro/falso).
export function accuracyByType(stats: QuestionStatRow[]): TypeAccuracy[] {
  const byType = new Map<string, { correct: number; total: number }>();
  for (const stat of stats) {
    const acc = byType.get(stat.tipo) ?? { correct: 0, total: 0 };
    acc.correct += stat.total - stat.wrong;
    acc.total += stat.total;
    byType.set(stat.tipo, acc);
  }
  return [...byType.entries()]
    .map(([tipo, acc]) => ({
      tipo,
      accuracy: Math.round((acc.correct / acc.total) * 100),
      total: acc.total,
    }))
    .sort((a, b) => b.total - a.total);
}
