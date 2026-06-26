import { describe, it, expect, beforeEach } from 'vitest';
import { StartSessionUseCase } from './start-session.use-case';
import { StudySession } from '../../domain/entities/study-session';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';
import type { StudyCardQuery, StudyCardView } from '../../domain/ports/study-card-query';

const card = (id: string, conceito: string | null = null): StudyCardView => ({
  id,
  pergunta: 'P',
  resposta: 'R',
  conceito,
  fase: 'LEARN',
  learningStep: 0,
});

class FakeStudySessionRepository implements StudySessionRepository {
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

class FakeStudyCardQuery implements StudyCardQuery {
  due: StudyCardView[] = [];
  fresh: StudyCardView[] = [];
  newLimit?: number;
  async findDueCards(): Promise<StudyCardView[]> {
    return this.due;
  }
  async findNewCards(_userId: string, limit: number): Promise<StudyCardView[]> {
    this.newLimit = limit;
    return this.fresh;
  }
}

describe('StartSessionUseCase', () => {
  let sessions: FakeStudySessionRepository;
  let cards: FakeStudyCardQuery;
  let useCase: StartSessionUseCase;

  beforeEach(() => {
    sessions = new FakeStudySessionRepository();
    cards = new FakeStudyCardQuery();
    useCase = new StartSessionUseCase(sessions, cards);
  });

  it('opens a session and returns its id', async () => {
    const res = await useCase.execute('u1');
    expect(sessions.started).toEqual(['u1']);
    expect(res.sessionId).toBe('sess-1');
  });

  it('returns due cards followed by new cards (capped at 10 new)', async () => {
    cards.due = [card('d1'), card('d2')];
    cards.fresh = [card('n1')];

    const res = await useCase.execute('u1');

    expect(cards.newLimit).toBe(10);
    // due cards come before new cards (interleaving is identity for this small set).
    expect(res.cards.map((c) => c.id)).toEqual(['d1', 'd2', 'n1']);
  });

  it('caps the queue at 30 cards total', async () => {
    cards.due = Array.from({ length: 25 }, (_, i) => card(`d${i}`));
    cards.fresh = Array.from({ length: 10 }, (_, i) => card(`n${i}`));

    const res = await useCase.execute('u1');

    expect(res.cards).toHaveLength(30);
  });
});
