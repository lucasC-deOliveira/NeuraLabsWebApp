import type { QuestaoItemSource } from '../../domain/ports/questao-item-source';
import {
  answerTotals,
  attemptHistory,
  alternativeShares,
} from '../../domain/services/question-item-stats';
import type { QuestaoItemAnalytics } from '../../domain/questao-item-views';

/**
 * Analytics de UMA questão: agrega as respostas daquele item nas tentativas do
 * usuário (acurácia, histórico, distribuição de alternativas com gabarito).
 * Retorna null quando a questão não existe/não é do usuário (o controller → 404).
 * @example useCase.execute(userId, questaoId)
 */
export class GetQuestaoItemAnalyticsUseCase {
  constructor(private readonly source: QuestaoItemSource) {}

  async execute(userId: string, questaoId: string): Promise<QuestaoItemAnalytics | null> {
    const [meta, answers] = await Promise.all([
      this.source.questionMeta(userId, questaoId),
      this.source.questionAnswers(userId, questaoId),
    ]);
    if (!meta) return null;
    const totals = answerTotals(answers);
    return {
      enunciado: meta.enunciado,
      totals: { respostas: totals.respostas, wrong: totals.wrong },
      accuracy: totals.accuracy,
      history: attemptHistory(answers),
      alternativas: alternativeShares(answers, meta.gabarito),
    };
  }
}
