import { StudySession } from '../../domain/entities/study-session';
import type { StudyRepositories, StudyUnitOfWork } from '../../domain/ports/study-unit-of-work';
import type { VaultImportSessionRepository } from '../../domain/ports/vault-import-session-repository';
import { Grade } from '../../domain/value-objects/grade';

export interface VaultReviewInput {
  flashcardId: string;
  grade?: string;
  // Legacy fields (compat with old sessions, before the 4-button grading).
  acertou?: boolean;
  nivelConfianca?: number;
  tempoResposta?: number;
  revisadoEm: string;
}

export interface VaultSessionInput {
  startedAt: string;
  endedAt: string | null;
  revisoes: VaultReviewInput[];
}

interface ApplyReviewContext {
  userId: string;
  sessionId: string;
  flashcardId: string;
  responseTimeMs?: number;
  grade: Grade;
  reviewedAt: Date;
}

/**
 * Imports offline study sessions/reviews idempotently: replays each review,
 * skipping the reschedule when it predates the card's last review. Tolerant —
 * a failed session/review never aborts the rest.
 * @example useCase.execute(userId, vaultSessions)
 */
export class SyncVaultLogUseCase {
  constructor(
    private readonly imports: VaultImportSessionRepository,
    private readonly uow: StudyUnitOfWork,
  ) {}

  async execute(userId: string, sessions: VaultSessionInput[]): Promise<{ synced: number }> {
    const ordered = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    let synced = 0;
    for (const session of ordered) {
      if (await this.importSession(userId, session)) synced++;
    }
    return { synced };
  }

  private async importSession(userId: string, session: VaultSessionInput): Promise<boolean> {
    if (!session.revisoes?.length) return false;
    try {
      const endedAt = session.endedAt ? new Date(session.endedAt) : new Date();
      const db = await this.imports.createSession(userId, new Date(session.startedAt), endedAt);
      const reviews = [...session.revisoes].sort((a, b) =>
        a.revisadoEm.localeCompare(b.revisadoEm),
      );
      for (const review of reviews) await this.importReview(userId, db.id, review);
      return true;
    } catch {
      return false; // a failed session must not abort the whole import
    }
  }

  private async importReview(
    userId: string,
    sessionId: string,
    review: VaultReviewInput,
  ): Promise<void> {
    try {
      const ctx = this.toContext(userId, sessionId, review);
      await this.uow.execute((repos) => this.applyReview(repos, ctx));
    } catch {
      // tolerant: a single failed review must not abort the import
    }
  }

  private toContext(userId: string, sessionId: string, review: VaultReviewInput): ApplyReviewContext {
    const grade = review.grade
      ? Grade.create(review.grade)
      : Grade.fromLegacy(review.acertou ?? false, review.nivelConfianca ?? 0);
    return {
      userId,
      sessionId,
      flashcardId: review.flashcardId,
      responseTimeMs: review.tempoResposta,
      grade,
      reviewedAt: new Date(review.revisadoEm),
    };
  }

  private async applyReview(repos: StudyRepositories, ctx: ApplyReviewContext): Promise<void> {
    const flashcard = await repos.flashcards.findOwnedBy(ctx.flashcardId, ctx.userId);
    if (!flashcard) return;

    const session = StudySession.create({ id: ctx.sessionId, userId: ctx.userId });
    session.recordReview({
      flashcardId: flashcard.id,
      grade: ctx.grade,
      answer: '',
      responseTimeMs: ctx.responseTimeMs,
    });
    const rescheduled = flashcard.reviewAt(ctx.grade, ctx.reviewedAt);

    await repos.sessions.save(session);
    if (rescheduled) await repos.flashcards.save(flashcard);
  }
}
