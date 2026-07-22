import type { AttemptRow, ProvaAnalyticsSource } from '../../domain/ports/prova-analytics-source';
import { scoreProgression } from '../../domain/services/score-progression';
import { hardestQuestions, accuracyByType } from '../../domain/services/question-difficulty';
import type { ProvaAnalytics } from '../../domain/prova-analytics-views';

/**
 * Reúne o analytics de questões/provas do usuário a partir das tentativas
 * capturadas: progresso de score por prova, questões mais erradas e acurácia por tipo.
 * @example useCase.execute(userId)
 */
export class GetProvaAnalyticsUseCase {
  constructor(private readonly source: ProvaAnalyticsSource) {}

  async execute(userId: string): Promise<ProvaAnalytics> {
    const [attempts, stats] = await Promise.all([
      this.source.attempts(userId),
      this.source.questionStats(userId),
    ]);
    return {
      totals: computeTotals(attempts),
      progress: scoreProgression(attempts),
      hardestQuestions: hardestQuestions(stats),
      accuracyByType: accuracyByType(stats),
    };
  }
}

function computeTotals(attempts: AttemptRow[]): ProvaAnalytics['totals'] {
  const provas = new Set(attempts.map((a) => a.provaId)).size;
  const acertos = attempts.reduce((sum, a) => sum + a.acertos, 0);
  const total = attempts.reduce((sum, a) => sum + a.total, 0);
  return {
    tentativas: attempts.length,
    provas,
    accuracy: total > 0 ? Math.round((acertos / total) * 100) : null,
  };
}
