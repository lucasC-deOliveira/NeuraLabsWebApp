import { describe, it, expect, beforeEach } from 'vitest';
import { StartSingleCardStudyUseCase } from './start-single-card-study.use-case';
import { StudySession } from '../../domain/entities/study-session';
import type {
  FlashcardStudyView,
  StudyFlashcardQuery,
} from '../../domain/ports/study-flashcard-query';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';

class FakeFlashcardQuery implements StudyFlashcardQuery {
  result: FlashcardStudyView | null = null;
  async findForStudy(): Promise<FlashcardStudyView | null> {
    return this.result;
  }
}

class FakeSessionRepository implements StudySessionRepository {
  started: string[] = [];
  async start(userId: string): Promise<StudySession> {
    this.started.push(userId);
    return StudySession.create({ id: 'sess-1', userId });
  }
  async findActive(): Promise<StudySession | null> {
    return null;
  }
  async save(): Promise<void> {}
}

const dueView: FlashcardStudyView = {
  id: 'fc-1',
  pergunta: 'P',
  resposta: 'R',
  conceito: 'C',
  due: true,
  proximaRevisao: null,
  fase: 'LEARN',
};

describe('StartSingleCardStudyUseCase', () => {
  let cards: FakeFlashcardQuery;
  let sessions: FakeSessionRepository;
  let useCase: StartSingleCardStudyUseCase;

  beforeEach(() => {
    cards = new FakeFlashcardQuery();
    sessions = new FakeSessionRepository();
    useCase = new StartSingleCardStudyUseCase(cards, sessions);
  });

  it('returns null when the card is not found', async () => {
    cards.result = null;
    expect(await useCase.execute('u1', 'x')).toBeNull();
    expect(sessions.started).toHaveLength(0);
  });

  it('opens a session when the card is due', async () => {
    cards.result = dueView;
    const res = await useCase.execute('u1', 'fc-1');
    expect(sessions.started).toEqual(['u1']);
    expect(res).toEqual({
      sessionId: 'sess-1',
      card: { id: 'fc-1', pergunta: 'P', resposta: 'R', conceito: 'C' },
      due: true,
      proximaRevisao: null,
      fase: 'LEARN',
    });
  });

  it('does not open a session when the card is not due', async () => {
    cards.result = {
      ...dueView,
      due: false,
      proximaRevisao: '2099-01-01T00:00:00.000Z',
      fase: 'REVIEW',
    };
    const res = await useCase.execute('u1', 'fc-1');
    expect(sessions.started).toHaveLength(0);
    expect(res?.sessionId).toBeNull();
    expect(res?.due).toBe(false);
  });
});
