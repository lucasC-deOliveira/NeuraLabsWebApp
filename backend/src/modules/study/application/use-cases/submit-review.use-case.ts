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
  // Campos legados (compatibilidade com sessões antigas, antes dos 4 botões).
  acertou?: boolean;
  nivelConfianca?: number;
  tempoResposta?: number;
  sessaoId?: string;
}

// Nível de confiança gravado por grade (mantém compatibilidade com dados antigos).
const CONFIDENCE_BY_GRADE: Record<ReviewGrade, number> = { again: 0, hard: 2, good: 4, easy: 5 };

/**
 * Registra a revisão de um flashcard e reagenda-o (SM-2), de forma atômica.
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
