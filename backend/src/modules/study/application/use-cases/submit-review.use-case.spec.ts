import { describe, it, expect, beforeEach } from 'vitest';
import { SubmitReviewUseCase } from './submit-review.use-case';
import { CardNotFoundError, NoActiveSessionError } from '../../domain/errors';
import type { Clock } from '../../domain/ports/clock';
import type {
  ReviewRecord,
  SessionRef,
  StudyRepository,
  StudyTxRepository,
} from '../../domain/ports/study-repository';
import type { ScheduleState } from '../../domain/services/spaced-repetition';

class FakeClock implements Clock {
  constructor(private readonly fixed: Date) {}
  now(): Date {
    return this.fixed;
  }
}

// Named fake of the repositories (no DB). Acts as both repo and tx repo (UoW).
class FakeStudyRepository implements StudyRepository, StudyTxRepository {
  activeSession: SessionRef | null = { id: 'sess-1' };
  ownedCards = new Set<string>(['fc-1']);
  learning = new Map<string, ScheduleState>();
  reviews: ReviewRecord[] = [];

  async findActiveSession(): Promise<SessionRef | null> {
    return this.activeSession;
  }
  async withTransaction<T>(work: (tx: StudyTxRepository) => Promise<T>): Promise<T> {
    return work(this);
  }
  async isCardOwnedBy(flashcardId: string): Promise<boolean> {
    return this.ownedCards.has(flashcardId);
  }
  async getLearningState(flashcardId: string): Promise<ScheduleState | null> {
    return this.learning.get(flashcardId) ?? null;
  }
  async createReview(review: ReviewRecord): Promise<void> {
    this.reviews.push(review);
  }
  async saveLearningState(
    flashcardId: string,
    _userId: string,
    state: ScheduleState,
  ): Promise<void> {
    this.learning.set(flashcardId, state);
  }
}

const NOW = new Date('2026-06-22T12:00:00.000Z');

describe('SubmitReviewUseCase', () => {
  let repo: FakeStudyRepository;
  let useCase: SubmitReviewUseCase;

  beforeEach(() => {
    repo = new FakeStudyRepository();
    useCase = new SubmitReviewUseCase(repo, new FakeClock(NOW));
  });

  it('new card with good: records review (correct, confidence 4) and schedules LEARN step 1', async () => {
    const res = await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' });

    expect(res).toEqual({ success: true });
    expect(repo.reviews).toHaveLength(1);
    // respostaUsuario omitted → stores empty string (not undefined).
    expect(repo.reviews[0]).toMatchObject({
      acertou: true,
      nivelConfianca: 4,
      sessaoId: 'sess-1',
      respostaUsuario: '',
    });
    const ap = repo.learning.get('fc-1');
    expect(ap).toMatchObject({ fase: 'LEARN', learningStep: 1, fatorEase: 2.5 });
  });

  it('again on a REVIEW card: schedules RELEARN', async () => {
    repo.learning.set('fc-1', {
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 10,
      fatorEase: 2.5,
      dificuldade: 3,
      proximaRevisao: NOW,
      ultimaRevisao: NOW,
    });
    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'again' });

    expect(repo.reviews[0]).toMatchObject({ acertou: false, nivelConfianca: 0 });
    expect(repo.learning.get('fc-1')).toMatchObject({
      fase: 'RELEARN',
      fatorEase: 2.3,
      intervalo: 2,
    });
  });

  it('stores the confidence level matching each grade (hard=2, easy=5)', async () => {
    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'hard' });
    expect(repo.reviews.at(-1)).toMatchObject({ acertou: true, nivelConfianca: 2 });

    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'easy' });
    expect(repo.reviews.at(-1)).toMatchObject({ acertou: true, nivelConfianca: 5 });
  });

  it('derives grade from legacy fields (acertou + nivelConfianca)', async () => {
    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', acertou: true, nivelConfianca: 3 });
    // confidence 3 → good → stored confidence 4
    expect(repo.reviews[0]).toMatchObject({ acertou: true, nivelConfianca: 4 });
  });

  it('no active session: throws NoActiveSessionError and records nothing', async () => {
    repo.activeSession = null;
    await expect(
      useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' }),
    ).rejects.toBeInstanceOf(NoActiveSessionError);
    expect(repo.reviews).toHaveLength(0);
  });

  it('flashcard owned by another user: throws CardNotFoundError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', flashcardId: 'fc-desconhecido', grade: 'good' }),
    ).rejects.toBeInstanceOf(CardNotFoundError);
  });
});
