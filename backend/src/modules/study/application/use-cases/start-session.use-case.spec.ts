import { describe, it, expect, beforeEach } from 'vitest';
import { StartSessionUseCase } from './start-session.use-case';
import { StudySession } from '../../domain/entities/study-session';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';
import type { StudyCardQuery, StudyCardView } from '../../domain/ports/study-card-query';
import type { PrerequisiteMasteryQuery } from '../../domain/ports/prerequisite-mastery-query';
import type { ConceptPrerequisites } from '../../domain/services/prerequisite-readiness';

const card = (id: string, conceito: string | null = null): StudyCardView => ({
  id,
  pergunta: 'P',
  resposta: 'R',
  conceito,
  importancia: null,
  fase: 'LEARN',
  learningStep: 0,
  intervalo: 0,
  fatorEase: 2.5,
  dificuldade: 5,
  proximaRevisao: null,
  ultimaRevisao: null,
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

class FakePrerequisiteMasteryQuery implements PrerequisiteMasteryQuery {
  public askedFor: string[] = [];
  constructor(private readonly byConcept: ConceptPrerequisites = new Map()) {}
  async forConcepts(_userId: string, conceptNames: string[]): Promise<ConceptPrerequisites> {
    this.askedFor = conceptNames;
    return this.byConcept;
  }
}

describe('StartSessionUseCase prerequisite ordering', () => {
  it('delays cards whose concept depends on a weak prerequisite', async () => {
    const sessions = new FakeStudySessionRepository();
    const cards = new FakeStudyCardQuery();
    cards.due = [card('bloqueado', 'Dijkstra'), card('pronto', 'Grafos')];
    const prereqs = new FakePrerequisiteMasteryQuery(
      new Map([['Dijkstra', [{ nome: 'Grafos', dominio: 0.1 }]]]),
    );

    const res = await new StartSessionUseCase(sessions, cards, prereqs).execute('u1');

    expect(res.cards.map((c) => c.id)).toEqual(['pronto', 'bloqueado']);
    expect(prereqs.askedFor.sort()).toEqual(['Dijkstra', 'Grafos']);
  });

  it('keeps working when no prerequisite query is wired', async () => {
    const sessions = new FakeStudySessionRepository();
    const cards = new FakeStudyCardQuery();
    cards.due = [card('d1', 'Dijkstra')];

    const res = await new StartSessionUseCase(sessions, cards).execute('u1');

    expect(res.cards.map((c) => c.id)).toEqual(['d1']);
  });
});
