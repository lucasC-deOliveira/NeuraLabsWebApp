import { describe, it, expect, beforeEach } from 'vitest';
import { SubmitReviewUseCase } from './submit-review.use-case';
import { CardNotFoundError, NoActiveSessionError } from '../../domain/errors';
import { Flashcard } from '../../domain/entities/flashcard';
import { StudySession } from '../../domain/entities/study-session';
import type { Clock } from '../../domain/ports/clock';
import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';
import type { StudyRepositories, StudyUnitOfWork } from '../../domain/ports/study-unit-of-work';
import type { StudyPlan, StudyPlanRepository } from '../../domain/ports/study-plan-repository';

// Named fake of the study plan repository. Only listByUser matters here — it is
// what tells the scheduler whether there is an exam date to squeeze toward.
class FakeStudyPlanRepository implements StudyPlanRepository {
  plans: StudyPlan[] = [];

  async loadById(): Promise<StudyPlan | null> {
    return null;
  }
  async save(): Promise<StudyPlan> {
    throw new Error('not used in these tests');
  }
  async listByUser(): Promise<StudyPlan[]> {
    return this.plans;
  }
  async deleteById(): Promise<void> {
    /* not used in these tests */
  }
}

const planWithDeadline = (dataAlvo: Date | null, ativo = true): StudyPlan => ({
  id: 'plan-1',
  prioridade: 'prova',
  metaTipo: 'NOVOS',
  metaValor: 5,
  dataAlvo,
  ativo,
  grafoIds: [],
  baralhoIds: [],
  provaIds: [],
  conceitosExcluidos: [],
});

class FakeClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

// Named fake of the Flashcard aggregate repository (no DB).
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

// Named fake of the StudySession aggregate repository (no DB). Returns a fresh
// session per lookup, mirroring how each transaction loads its own aggregate.
class FakeStudySessionRepository implements StudySessionRepository {
  hasActive = true;
  readonly saved: StudySession[] = [];

  async start(userId: string): Promise<StudySession> {
    return StudySession.create({ id: 'sess-1', userId });
  }
  async findActive(): Promise<StudySession | null> {
    return this.hasActive ? StudySession.create({ id: 'sess-1', userId: 'u1' }) : null;
  }
  async save(session: StudySession): Promise<void> {
    this.saved.push(session);
  }
}

class FakeStudyUnitOfWork implements StudyUnitOfWork {
  constructor(
    readonly flashcards: FakeFlashcardRepository,
    readonly sessions: FakeStudySessionRepository,
  ) {}
  execute<T>(work: (repos: StudyRepositories) => Promise<T>): Promise<T> {
    return work({ flashcards: this.flashcards, sessions: this.sessions });
  }
}

const NOW = new Date('2026-06-22T12:00:00.000Z');

describe('SubmitReviewUseCase', () => {
  let flashcards: FakeFlashcardRepository;
  let sessions: FakeStudySessionRepository;
  let plans: FakeStudyPlanRepository;
  let useCase: SubmitReviewUseCase;

  beforeEach(() => {
    flashcards = new FakeFlashcardRepository();
    flashcards.cards.set('fc-1', Flashcard.create({ id: 'fc-1', ownerId: 'u1' }));
    sessions = new FakeStudySessionRepository();
    plans = new FakeStudyPlanRepository();
    useCase = new SubmitReviewUseCase(
      new FakeStudyUnitOfWork(flashcards, sessions),
      new FakeClock(NOW),
      plans,
    );
  });

  it('new card with good: records the review and schedules LEARN step 1', async () => {
    const res = await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' });

    expect(res.success).toBe(true);
    // O agendamento resultante volta junto: é com ele que a sessão de estudo decide
    // se o card reaparece agora ou espera a hora marcada.
    expect(res.schedule).toMatchObject({ fase: 'LEARN', learningStep: 1, fatorEase: 2.5 });
    const savedSession = sessions.saved[0];
    expect(savedSession.reviews).toHaveLength(1);
    // respostaUsuario omitted → stored as empty string (not undefined).
    expect(savedSession.reviews[0]).toMatchObject({ correct: true, confidence: 4, answer: '' });
    expect(flashcards.saved[0].learningState).toMatchObject({
      fase: 'LEARN',
      learningStep: 1,
      fatorEase: 2.5,
    });
  });

  it('again on a REVIEW card: schedules RELEARN', async () => {
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
          proximaRevisao: NOW,
          ultimaRevisao: NOW,
        },
      }),
    );

    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'again' });

    expect(sessions.saved[0].reviews[0]).toMatchObject({ correct: false, confidence: 0 });
    expect(flashcards.saved[0].learningState).toMatchObject({
      fase: 'RELEARN',
      fatorEase: 2.3,
      intervalo: 2,
    });
  });

  it('stores the confidence matching each grade (hard=2, easy=5)', async () => {
    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'hard' });
    expect(sessions.saved.at(-1)!.reviews[0]).toMatchObject({ correct: true, confidence: 2 });

    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'easy' });
    expect(sessions.saved.at(-1)!.reviews[0]).toMatchObject({ correct: true, confidence: 5 });
  });

  it('derives grade from legacy fields (acertou + nivelConfianca)', async () => {
    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', acertou: true, nivelConfianca: 3 });
    // confidence 3 → good → stored confidence 4
    expect(sessions.saved[0].reviews[0]).toMatchObject({ correct: true, confidence: 4 });
  });

  it('invalid grade: throws and saves nothing', async () => {
    await expect(
      useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'perfect' }),
    ).rejects.toThrowError(/invalid grade/);
    expect(sessions.saved).toHaveLength(0);
    expect(flashcards.saved).toHaveLength(0);
  });

  it('no active session: throws NoActiveSessionError and saves nothing', async () => {
    sessions.hasActive = false;
    await expect(
      useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' }),
    ).rejects.toBeInstanceOf(NoActiveSessionError);
    expect(sessions.saved).toHaveLength(0);
    expect(flashcards.saved).toHaveLength(0);
  });

  it('flashcard owned by another user: throws CardNotFoundError and saves nothing', async () => {
    flashcards.cards.set('fc-2', Flashcard.create({ id: 'fc-2', ownerId: 'someone-else' }));
    await expect(
      useCase.execute({ userId: 'u1', flashcardId: 'fc-2', grade: 'good' }),
    ).rejects.toBeInstanceOf(CardNotFoundError);
    expect(sessions.saved).toHaveLength(0);
    expect(flashcards.saved).toHaveLength(0);
  });
});

// The wiring between the study plan and the scheduler is invisible from the
// outside: without these, the deadline could stop being read and every SM-2 test
// would still pass.
describe('SubmitReviewUseCase with a study plan deadline', () => {
  const dias = (n: number): Date => new Date(NOW.getTime() + n * 86_400_000);

  let flashcards: FakeFlashcardRepository;
  let plans: FakeStudyPlanRepository;
  let useCase: SubmitReviewUseCase;

  // A card already in REVIEW with a long interval — a new card would sit in
  // LEARN, where the deadline deliberately changes nothing.
  const matureCard = (): Flashcard =>
    Flashcard.create({
      id: 'fc-1',
      ownerId: 'u1',
      learningState: {
        fase: 'REVIEW',
        learningStep: 0,
        intervalo: 60,
        fatorEase: 2.5,
        dificuldade: 3,
        proximaRevisao: NOW,
        ultimaRevisao: NOW,
      },
    });

  beforeEach(() => {
    flashcards = new FakeFlashcardRepository();
    flashcards.cards.set('fc-1', matureCard());
    plans = new FakeStudyPlanRepository();
    useCase = new SubmitReviewUseCase(
      new FakeStudyUnitOfWork(flashcards, new FakeStudySessionRepository()),
      new FakeClock(NOW),
      plans,
    );
  });

  it('squeezes the next review to fit before the plan deadline', async () => {
    plans.plans = [planWithDeadline(dias(30))];
    const res = await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' });
    expect(res.schedule?.intervalo).toBe(10);
  });

  it('leaves SM-2 alone when the plan has no deadline', async () => {
    plans.plans = [planWithDeadline(null)];
    const res = await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' });
    expect(res.schedule?.intervalo).toBeGreaterThan(100);
  });

  it('leaves SM-2 alone when the user has no plan at all', async () => {
    const res = await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' });
    expect(res.schedule?.intervalo).toBeGreaterThan(100);
  });

  it('schedules against the closest deadline when there are several plans', async () => {
    plans.plans = [planWithDeadline(dias(90)), { ...planWithDeadline(dias(15)), id: 'plan-2' }];
    const res = await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' });
    expect(res.schedule?.intervalo).toBe(5);
  });
});
