import { describe, it, expect } from 'vitest';
import { GetFlashcardForStudyUseCase } from './get-flashcard-for-study.use-case';
import type {
  FlashcardStudyView,
  StudyFlashcardQuery,
} from '../../domain/ports/study-flashcard-query';

const view: FlashcardStudyView = {
  id: 'fc-1',
  pergunta: 'P',
  resposta: 'R',
  conceito: 'C',
  due: true,
  proximaRevisao: null,
  fase: 'LEARN',
};

class FakeFlashcardQuery implements StudyFlashcardQuery {
  result: FlashcardStudyView | null = null;
  async findForStudy(): Promise<FlashcardStudyView | null> {
    return this.result;
  }
}

describe('GetFlashcardForStudyUseCase', () => {
  it('returns the card study view', async () => {
    const cards = new FakeFlashcardQuery();
    cards.result = view;
    const res = await new GetFlashcardForStudyUseCase(cards).execute('u1', 'fc-1');
    expect(res).toEqual(view);
  });

  it('returns null when the card is not found', async () => {
    const res = await new GetFlashcardForStudyUseCase(new FakeFlashcardQuery()).execute('u1', 'x');
    expect(res).toBeNull();
  });
});
