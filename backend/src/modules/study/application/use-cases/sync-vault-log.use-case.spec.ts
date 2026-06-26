import { describe, it, expect, beforeEach } from 'vitest';
import { SyncVaultLogUseCase } from './sync-vault-log.use-case';
import { Flashcard } from '../../domain/entities/flashcard';
import { StudySession } from '../../domain/entities/study-session';
import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';
import type { StudyRepositories, StudyUnitOfWork } from '../../domain/ports/study-unit-of-work';
import type { VaultImportSessionRepository } from '../../domain/ports/vault-import-session-repository';

class FakeImports implements VaultImportSessionRepository {
  created: Array<{ startedAt: Date; endedAt: Date }> = [];
  failOnStartedAt?: string;
  async createSession(_userId: string, startedAt: Date, endedAt: Date): Promise<{ id: string }> {
    if (this.failOnStartedAt === startedAt.toISOString()) throw new Error('db down');
    this.created.push({ startedAt, endedAt });
    return { id: `imp-${this.created.length}` };
  }
}

class FakeFlashcardRepository implements FlashcardRepository {
  readonly cards = new Map<string, Flashcard>();
  readonly saved: Flashcard[] = [];
  async findOwnedBy(flashcardId: string, userId: string): Promise<Flashcard | null> {
    const card = this.cards.get(flashcardId);
    return card && card.isOwnedBy(userId) ? card : null;
  }
  async save(flashcard: Flashcard): Promise<void> {
    this.saved.push(flashcard);
  }
}

class FakeSessionRepository implements StudySessionRepository {
  readonly saved: StudySession[] = [];
  async start(userId: string): Promise<StudySession> {
    return StudySession.create({ id: 'sess', userId });
  }
  async findActive(): Promise<StudySession | null> {
    return null;
  }
  async save(session: StudySession): Promise<void> {
    this.saved.push(session);
  }
}

class FakeUnitOfWork implements StudyUnitOfWork {
  constructor(
    readonly flashcards: FakeFlashcardRepository,
    readonly sessions: FakeSessionRepository,
  ) {}
  execute<T>(work: (repos: StudyRepositories) => Promise<T>): Promise<T> {
    return work({ flashcards: this.flashcards, sessions: this.sessions });
  }
}

const review = (
  over: Partial<{ flashcardId: string; grade: string; revisadoEm: string }> = {},
) => ({
  flashcardId: 'fc-1',
  grade: 'good',
  revisadoEm: '2026-06-22T12:00:00.000Z',
  ...over,
});

describe('SyncVaultLogUseCase', () => {
  let imports: FakeImports;
  let flashcards: FakeFlashcardRepository;
  let sessions: FakeSessionRepository;
  let useCase: SyncVaultLogUseCase;

  beforeEach(() => {
    imports = new FakeImports();
    flashcards = new FakeFlashcardRepository();
    flashcards.cards.set('fc-1', Flashcard.create({ id: 'fc-1', ownerId: 'u1' }));
    sessions = new FakeSessionRepository();
    useCase = new SyncVaultLogUseCase(imports, new FakeUnitOfWork(flashcards, sessions));
  });

  it('imports a session, records the review and reschedules the card', async () => {
    const res = await useCase.execute('u1', [
      { startedAt: '2026-06-22T11:00:00.000Z', endedAt: null, revisoes: [review()] },
    ]);

    expect(res.synced).toBe(1);
    expect(sessions.saved[0].reviews[0]).toMatchObject({ correct: true, confidence: 4 });
    expect(flashcards.saved[0].learningState).toMatchObject({ fase: 'LEARN', learningStep: 1 });
  });

  it('does not count a session with no reviews', async () => {
    const res = await useCase.execute('u1', [
      { startedAt: '2026-06-22T11:00:00.000Z', endedAt: null, revisoes: [] },
    ]);
    expect(res.synced).toBe(0);
    expect(imports.created).toHaveLength(0);
  });

  it('skips a review for an unknown card but still counts the session', async () => {
    const res = await useCase.execute('u1', [
      {
        startedAt: '2026-06-22T11:00:00.000Z',
        endedAt: null,
        revisoes: [review({ flashcardId: 'ghost' })],
      },
    ]);
    expect(res.synced).toBe(1);
    expect(flashcards.saved).toHaveLength(0);
    expect(sessions.saved).toHaveLength(0);
  });

  it('records the review but does not reschedule when it predates the last review', async () => {
    flashcards.cards.set(
      'fc-1',
      Flashcard.create({
        id: 'fc-1',
        ownerId: 'u1',
        learningState: {
          fase: 'REVIEW',
          learningStep: 0,
          intervalo: 10,
          fatorEase: 2.5,
          dificuldade: 3,
          proximaRevisao: new Date('2026-06-22T12:00:00.000Z'),
          ultimaRevisao: new Date('2026-06-22T12:00:00.000Z'),
        },
      }),
    );

    const res = await useCase.execute('u1', [
      {
        startedAt: '2026-06-20T11:00:00.000Z',
        endedAt: null,
        revisoes: [review({ grade: 'again', revisadoEm: '2026-06-20T12:00:00.000Z' })],
      },
    ]);

    expect(res.synced).toBe(1);
    expect(sessions.saved[0].reviews).toHaveLength(1); // review still recorded
    expect(flashcards.saved).toHaveLength(0); // but not rescheduled (stale)
  });

  it('preserves the session endedAt timestamp when provided', async () => {
    await useCase.execute('u1', [
      {
        startedAt: '2026-06-22T11:00:00.000Z',
        endedAt: '2026-06-22T11:30:00.000Z',
        revisoes: [review()],
      },
    ]);
    expect(imports.created[0].endedAt.toISOString()).toBe('2026-06-22T11:30:00.000Z');
  });

  it('imports sessions in chronological order (sorted by startedAt)', async () => {
    await useCase.execute('u1', [
      { startedAt: '2026-06-22T15:00:00.000Z', endedAt: null, revisoes: [review()] },
      { startedAt: '2026-06-22T09:00:00.000Z', endedAt: null, revisoes: [review()] },
    ]);
    expect(imports.created.map((c) => c.startedAt.toISOString())).toEqual([
      '2026-06-22T09:00:00.000Z',
      '2026-06-22T15:00:00.000Z',
    ]);
  });

  it('is tolerant: a failed session create is skipped, others still import', async () => {
    imports.failOnStartedAt = '2026-06-22T09:00:00.000Z';
    const res = await useCase.execute('u1', [
      { startedAt: '2026-06-22T09:00:00.000Z', endedAt: null, revisoes: [review()] },
      { startedAt: '2026-06-22T15:00:00.000Z', endedAt: null, revisoes: [review()] },
    ]);
    expect(res.synced).toBe(1);
  });

  it('is tolerant: an invalid grade skips that review without aborting', async () => {
    const res = await useCase.execute('u1', [
      {
        startedAt: '2026-06-22T11:00:00.000Z',
        endedAt: null,
        revisoes: [review({ grade: 'perfect' }), review({ grade: 'good' })],
      },
    ]);
    expect(res.synced).toBe(1);
    // only the valid review went through
    expect(sessions.saved).toHaveLength(1);
  });
});
