import { describe, it, expect } from 'vitest';
import { GetGamificationSummaryUseCase } from './get-gamification-summary.use-case';
import type {
  FlashcardAnalyticsSource,
  LearningStateRow,
  ProblemCardRow,
  ReviewRow,
} from '../../domain/ports/flashcard-analytics-source';

// Named fake: only reviewsSince matters here; the rest returns empty.
class FakeSource implements FlashcardAnalyticsSource {
  public since: Date | null = null;
  constructor(private readonly reviews: ReviewRow[]) {}
  learningStates(): Promise<LearningStateRow[]> {
    return Promise.resolve([]);
  }
  reviewsSince(_userId: string, since: Date): Promise<ReviewRow[]> {
    this.since = since;
    return Promise.resolve(this.reviews);
  }
  problemCardStats(): Promise<ProblemCardRow[]> {
    return Promise.resolve([]);
  }
}

const review = (iso: string): ReviewRow => ({
  data: new Date(iso),
  acertou: true,
  nivelConfianca: 3,
  tempoResposta: null,
  tipoErro: null,
});

describe('GetGamificationSummaryUseCase', () => {
  it('summarizes the review history into today count + streak', async () => {
    const today = new Date();
    const source = new FakeSource([review(today.toISOString())]);

    const summary = await new GetGamificationSummaryUseCase(source).execute('u1');

    expect(summary.reviewsToday).toBe(1);
    expect(summary.streak).toBe(1);
  });

  it('loads a wide enough window for the streak (well over a month)', async () => {
    const source = new FakeSource([]);

    await new GetGamificationSummaryUseCase(source).execute('u1');

    const daysBack = (Date.now() - (source.since?.getTime() ?? 0)) / 86_400_000;
    expect(daysBack).toBeGreaterThan(90);
  });
});
