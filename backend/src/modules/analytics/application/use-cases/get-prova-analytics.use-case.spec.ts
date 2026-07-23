import { describe, it, expect } from 'vitest';
import { GetProvaAnalyticsUseCase } from './get-prova-analytics.use-case';
import type {
  AttemptRow,
  ProvaAnalyticsSource,
  QuestionStatRow,
} from '../../domain/ports/prova-analytics-source';

class FakeProvaAnalyticsSource implements ProvaAnalyticsSource {
  constructor(
    private readonly rows: AttemptRow[],
    private readonly stats: QuestionStatRow[] = [],
  ) {}
  async attempts(): Promise<AttemptRow[]> {
    return this.rows;
  }
  async questionStats(): Promise<QuestionStatRow[]> {
    return this.stats;
  }
}

describe('GetProvaAnalyticsUseCase', () => {
  it('assembles totals, progress, hardest questions and accuracy by type', async () => {
    const source = new FakeProvaAnalyticsSource(
      [
        { provaId: 'p1', titulo: 'P1', dataFim: new Date('2026-07-20'), acertos: 5, total: 10 },
        { provaId: 'p1', titulo: 'P1', dataFim: new Date('2026-07-21'), acertos: 9, total: 10 },
      ],
      [{ enunciado: 'Q1', tipo: 'MULTIPLA_ESCOLHA', total: 4, wrong: 3 }],
    );
    const result = await new GetProvaAnalyticsUseCase(source).execute('u1');

    expect(result.totals).toEqual({ tentativas: 2, provas: 1, accuracy: 70 });
    expect(result.progress[0].points).toHaveLength(2);
    expect(result.hardestQuestions[0]).toMatchObject({ enunciado: 'Q1', wrong: 3, accuracy: 25 });
    expect(result.accuracyByType).toEqual([{ tipo: 'MULTIPLA_ESCOLHA', accuracy: 25, total: 4 }]);
  });

  it('has null accuracy when there are no attempts', async () => {
    const result = await new GetProvaAnalyticsUseCase(new FakeProvaAnalyticsSource([])).execute(
      'u1',
    );
    expect(result.totals).toEqual({ tentativas: 0, provas: 0, accuracy: null });
  });
});
