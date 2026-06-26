import { CardNotFoundError, NoActiveSessionError } from '../../domain/errors';
import type { Clock } from '../../domain/ports/clock';
import type { StudyRepositories, StudyUnitOfWork } from '../../domain/ports/study-unit-of-work';
import { Grade } from '../../domain/value-objects/grade';

export interface SubmitReviewCommand {
  userId: string;
  flashcardId: string;
  respostaUsuario?: string;
  grade?: string;
  // Legacy fields (compat with old sessions, before the 4-button grading).
  acertou?: boolean;
  nivelConfianca?: number;
  tempoResposta?: number;
  sessaoId?: string;
}

/**
 * Records a flashcard review and reschedules it (SM-2), atomically across the
 * StudySession and Flashcard aggregates.
 * @example useCase.execute({ userId, flashcardId, grade: 'good', sessaoId })
 */
export class SubmitReviewUseCase {
  constructor(
    private readonly uow: StudyUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: SubmitReviewCommand): Promise<{ success: boolean }> {
    const grade = this.resolveGrade(cmd);
    await this.uow.execute((repos) => this.review(repos, cmd, grade));
    return { success: true };
  }

  private async review(
    repos: StudyRepositories,
    cmd: SubmitReviewCommand,
    grade: Grade,
  ): Promise<void> {
    const session = await repos.sessions.findActive(cmd.userId, cmd.sessaoId);
    if (!session) throw new NoActiveSessionError(cmd.userId);

    const flashcard = await repos.flashcards.findOwnedBy(cmd.flashcardId, cmd.userId);
    if (!flashcard) throw new CardNotFoundError(cmd.flashcardId);

    session.recordReview({
      flashcardId: flashcard.id,
      grade,
      answer: cmd.respostaUsuario,
      responseTimeMs: cmd.tempoResposta,
    });
    flashcard.review(grade, this.clock.now());

    await repos.sessions.save(session);
    await repos.flashcards.save(flashcard);
  }

  private resolveGrade(cmd: SubmitReviewCommand): Grade {
    if (cmd.grade) return Grade.create(cmd.grade);
    return Grade.fromLegacy(cmd.acertou ?? false, cmd.nivelConfianca ?? 0);
  }
}
