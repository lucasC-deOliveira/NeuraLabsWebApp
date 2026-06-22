import { CardNotFoundError, NoActiveSessionError } from '../../domain/errors';
import type { Clock } from '../../domain/ports/clock';
import type {
  ReviewRecord,
  StudyRepository,
  StudyTxRepository,
} from '../../domain/ports/study-repository';
import {
  gradeFromLegacy,
  scheduleCard,
  type ReviewGrade,
} from '../../domain/services/spaced-repetition';

export interface SubmitReviewCommand {
  userId: string;
  flashcardId: string;
  respostaUsuario?: string;
  grade?: ReviewGrade;
  // Legacy fields (compat with old sessions, before the 4-button grading).
  acertou?: boolean;
  nivelConfianca?: number;
  tempoResposta?: number;
  sessaoId?: string;
}

// Confidence level stored per grade (keeps compatibility with old data).
const CONFIDENCE_BY_GRADE: Record<ReviewGrade, number> = { again: 0, hard: 2, good: 4, easy: 5 };

/**
 * Records a flashcard review and reschedules it (SM-2), atomically.
 * @example useCase.execute({ userId, flashcardId, grade: 'good', sessaoId })
 */
export class SubmitReviewUseCase {
  constructor(
    private readonly repo: StudyRepository,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: SubmitReviewCommand): Promise<{ success: boolean }> {
    const session = await this.repo.findActiveSession(cmd.userId, cmd.sessaoId);
    if (!session) throw new NoActiveSessionError(cmd.userId);

    const grade = cmd.grade ?? gradeFromLegacy(cmd.acertou ?? false, cmd.nivelConfianca ?? 0);
    await this.repo.withTransaction((tx) => this.record(tx, cmd, session.id, grade));
    return { success: true };
  }

  private async record(
    tx: StudyTxRepository,
    cmd: SubmitReviewCommand,
    sessaoId: string,
    grade: ReviewGrade,
  ): Promise<void> {
    if (!(await tx.isCardOwnedBy(cmd.flashcardId, cmd.userId))) {
      throw new CardNotFoundError(cmd.flashcardId);
    }
    await tx.createReview(this.toReviewRecord(cmd, sessaoId, grade));
    const current = await tx.getLearningState(cmd.flashcardId, cmd.userId);
    const next = scheduleCard(grade, current, this.clock.now());
    await tx.saveLearningState(cmd.flashcardId, cmd.userId, next);
  }

  private toReviewRecord(
    cmd: SubmitReviewCommand,
    sessaoId: string,
    grade: ReviewGrade,
  ): ReviewRecord {
    return {
      flashcardId: cmd.flashcardId,
      sessaoId,
      respostaUsuario: cmd.respostaUsuario ?? '',
      acertou: grade !== 'again',
      nivelConfianca: CONFIDENCE_BY_GRADE[grade],
      tempoResposta: cmd.tempoResposta,
    };
  }
}
