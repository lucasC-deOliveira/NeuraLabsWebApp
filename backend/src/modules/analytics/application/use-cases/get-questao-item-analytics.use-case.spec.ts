import { describe, it, expect } from 'vitest';
import { GetQuestaoItemAnalyticsUseCase } from './get-questao-item-analytics.use-case';
import type {
  QuestaoAnswerRow,
  QuestaoItemMeta,
  QuestaoItemSource,
} from '../../domain/ports/questao-item-source';

function answer(day: string, acertou: boolean, escolhida: string): QuestaoAnswerRow {
  return { data: new Date(day), acertou, escolhida };
}

class FakeQuestaoItemSource implements QuestaoItemSource {
  constructor(
    private readonly meta: QuestaoItemMeta | null,
    private readonly answers: QuestaoAnswerRow[],
  ) {}
  questionAnswers(): Promise<QuestaoAnswerRow[]> {
    return Promise.resolve(this.answers);
  }
  questionMeta(): Promise<QuestaoItemMeta | null> {
    return Promise.resolve(this.meta);
  }
}

describe('GetQuestaoItemAnalyticsUseCase', () => {
  it('returns null when the question is not found', async () => {
    const useCase = new GetQuestaoItemAnalyticsUseCase(new FakeQuestaoItemSource(null, []));
    expect(await useCase.execute('u1', 'missing')).toBeNull();
  });

  it('assembles totals, history and alternative distribution with the gabarito', async () => {
    const meta: QuestaoItemMeta = { enunciado: 'Qual a complexidade?', gabarito: 'O(log n)' };
    const answers = [
      answer('2026-01-02', true, 'O(log n)'),
      answer('2026-01-01', false, 'O(n)'),
      answer('2026-01-03', true, 'O(log n)'),
    ];
    const useCase = new GetQuestaoItemAnalyticsUseCase(new FakeQuestaoItemSource(meta, answers));

    const result = await useCase.execute('u1', 'q1');

    expect(result?.enunciado).toBe('Qual a complexidade?');
    expect(result?.totals).toEqual({ respostas: 3, wrong: 1 });
    expect(result?.accuracy).toBe(67);
    expect(result?.history[0]).toEqual({ date: '2026-01-01', acertou: false });
    expect(result?.alternativas[0]).toEqual({
      opcao: 'O(log n)',
      count: 2,
      pct: 67,
      correta: true,
    });
  });
});
