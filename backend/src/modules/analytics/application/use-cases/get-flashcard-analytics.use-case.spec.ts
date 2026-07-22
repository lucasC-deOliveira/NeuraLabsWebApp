import { describe, it, expect } from 'vitest';
import { GetFlashcardAnalyticsUseCase } from './get-flashcard-analytics.use-case';
import type {
  FlashcardAnalyticsSource,
  LearningStateRow,
  ReviewRow,
} from '../../domain/ports/flashcard-analytics-source';

// Named fake of the analytics read source (no DB).
class FakeAnalyticsSource implements FlashcardAnalyticsSource {
  constructor(
    private readonly states: LearningStateRow[],
    private readonly reviews: ReviewRow[],
  ) {}
  async learningStates(): Promise<LearningStateRow[]> {
    return this.states;
  }
  async reviewsSince(): Promise<ReviewRow[]> {
    return this.reviews;
  }
}

describe('GetFlashcardAnalyticsUseCase', () => {
  it('assembles totals and every analytics section', async () => {
    const now = new Date();
    const source = new FakeAnalyticsSource(
      [{ fase: 'REVIEW', intervalo: 30, proximaRevisao: now }],
      [{ data: now, acertou: true, nivelConfianca: 5, tempoResposta: 3000 }],
    );
    const result = await new GetFlashcardAnalyticsUseCase(source).execute('u1');

    expect(result.totals).toEqual({ cards: 1, reviews: 1 });
    expect(result.maturity).toEqual({ learning: 0, young: 0, mature: 1 });
    expect(result.retentionForecast).toHaveLength(30);
    expect(result.accuracyTrend).toHaveLength(1);
    expect(result.profile.map((a) => a.axis)).toContain('Acurácia');
  });
});
