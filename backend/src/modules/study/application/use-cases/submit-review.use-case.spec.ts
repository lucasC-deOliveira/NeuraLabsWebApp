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

// Fake nomeado dos repositórios (sem DB). Atua como repo e como tx repo (UoW).
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

  it('carta nova com good: grava revisão (acertou, confiança 4) e agenda LEARN passo 1', async () => {
    const res = await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' });

    expect(res).toEqual({ success: true });
    expect(repo.reviews).toHaveLength(1);
    // respostaUsuario omitido → grava string vazia (não undefined).
    expect(repo.reviews[0]).toMatchObject({
      acertou: true,
      nivelConfianca: 4,
      sessaoId: 'sess-1',
      respostaUsuario: '',
    });
    const ap = repo.learning.get('fc-1');
    expect(ap).toMatchObject({ fase: 'LEARN', learningStep: 1, fatorEase: 2.5 });
  });

  it('again sobre carta em REVIEW: agenda RELEARN', async () => {
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

  it('grava o nível de confiança correspondente a cada grade (hard=2, easy=5)', async () => {
    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'hard' });
    expect(repo.reviews.at(-1)).toMatchObject({ acertou: true, nivelConfianca: 2 });

    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'easy' });
    expect(repo.reviews.at(-1)).toMatchObject({ acertou: true, nivelConfianca: 5 });
  });

  it('deriva grade de campos legados (acertou + nivelConfianca)', async () => {
    await useCase.execute({ userId: 'u1', flashcardId: 'fc-1', acertou: true, nivelConfianca: 3 });
    // confiança 3 → good → confiança gravada 4
    expect(repo.reviews[0]).toMatchObject({ acertou: true, nivelConfianca: 4 });
  });

  it('sem sessão ativa: lança NoActiveSessionError e não grava nada', async () => {
    repo.activeSession = null;
    await expect(
      useCase.execute({ userId: 'u1', flashcardId: 'fc-1', grade: 'good' }),
    ).rejects.toBeInstanceOf(NoActiveSessionError);
    expect(repo.reviews).toHaveLength(0);
  });

  it('flashcard de outro dono: lança CardNotFoundError', async () => {
    await expect(
      useCase.execute({ userId: 'u1', flashcardId: 'fc-desconhecido', grade: 'good' }),
    ).rejects.toBeInstanceOf(CardNotFoundError);
  });
});
