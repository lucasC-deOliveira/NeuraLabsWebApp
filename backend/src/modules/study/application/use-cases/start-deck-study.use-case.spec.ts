import { describe, it, expect, beforeEach } from 'vitest';
import { StartDeckStudyUseCase } from './start-deck-study.use-case';
import { StudySession } from '../../domain/entities/study-session';
import type { DeckStudyView, StudyDeckQuery } from '../../domain/ports/study-deck-query';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';

class FakeDeckQuery implements StudyDeckQuery {
  result: DeckStudyView | null = null;
  async findDeckForStudy(): Promise<DeckStudyView | null> {
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

describe('StartDeckStudyUseCase', () => {
  let decks: FakeDeckQuery;
  let sessions: FakeSessionRepository;
  let useCase: StartDeckStudyUseCase;

  beforeEach(() => {
    decks = new FakeDeckQuery();
    sessions = new FakeSessionRepository();
    useCase = new StartDeckStudyUseCase(decks, sessions);
  });

  it('returns null and opens no session when the deck is not found', async () => {
    decks.result = null;
    expect(await useCase.execute('u1', 'deck-x')).toBeNull();
    expect(sessions.started).toHaveLength(0);
  });

  it('opens a session and returns the deck view', async () => {
    decks.result = {
      titulo: 'Sabedoria',
      totalNoDeck: 3,
      cards: [
        {
          id: 'fc-1',
          pergunta: 'P',
          resposta: 'R',
          conceito: 'C',
          importancia: null,
          fase: 'LEARN',
          learningStep: 0,
          intervalo: 0,
          fatorEase: 2.5,
          dificuldade: 5,
          proximaRevisao: null,
          ultimaRevisao: null,
        },
      ],
    };

    const res = await useCase.execute('u1', 'deck-1');

    expect(sessions.started).toEqual(['u1']);
    expect(res).toEqual({
      sessionId: 'sess-1',
      titulo: 'Sabedoria',
      totalNoDeck: 3,
      cards: decks.result.cards,
    });
  });
});
