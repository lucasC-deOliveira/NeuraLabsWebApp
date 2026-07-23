import type {
  FlashcardItemMeta,
  FlashcardItemSource,
} from '../../domain/ports/flashcard-item-source';
import type { ReviewRow } from '../../domain/ports/flashcard-analytics-source';
import { summarizeReviews } from '../../domain/services/flashcard-item-summary';
import { accuracyTrend } from '../../domain/services/accuracy-trend';
import { errorTaxonomy } from '../../domain/services/error-taxonomy';
import type { FlashcardItemAnalytics } from '../../domain/flashcard-item-views';

/**
 * Analytics de UMA carta: agrega o histórico de revisões daquele flashcard para o
 * usuário (acurácia, confiança, tendência, erros) + estado SM-2 atual.
 * Retorna null quando a carta não existe/não é do usuário (o controller → 404).
 * @example useCase.execute(userId, cardId)
 */
export class GetFlashcardItemAnalyticsUseCase {
  constructor(private readonly source: FlashcardItemSource) {}

  async execute(userId: string, cardId: string): Promise<FlashcardItemAnalytics | null> {
    const [meta, reviews] = await Promise.all([
      this.source.cardMeta(userId, cardId),
      this.source.cardReviews(userId, cardId),
    ]);
    return meta ? assemble(meta, reviews) : null;
  }
}

function assemble(meta: FlashcardItemMeta, reviews: ReviewRow[]): FlashcardItemAnalytics {
  const summary = summarizeReviews(reviews);
  return {
    pergunta: meta.pergunta,
    totals: { reviews: summary.reviews, wrong: summary.wrong },
    accuracy: summary.accuracy,
    avgConfidence: summary.avgConfidence,
    state: meta.state
      ? {
          fase: meta.state.fase,
          intervalo: meta.state.intervalo,
          proximaRevisao: meta.state.proximaRevisao.toISOString(),
        }
      : null,
    accuracyTrend: accuracyTrend(reviews),
    errorTaxonomy: errorTaxonomy(reviews),
  };
}
