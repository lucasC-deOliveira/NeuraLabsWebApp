import type { Flashcard } from '../../domain/entities/flashcard';
import type { StudySession } from '../../domain/entities/study-session';
import { CardNotFoundError, NoActiveSessionError } from '../../domain/errors';
import type { Clock } from '../../domain/ports/clock';
import type { StudyPlanRepository } from '../../domain/ports/study-plan-repository';
import type { StudyRepositories, StudyUnitOfWork } from '../../domain/ports/study-unit-of-work';
import { nearestDeadline } from '../../domain/services/plan-deadline';
import type { ScheduleState } from '../../domain/services/spaced-repetition';
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

// O agendamento resultante volta para quem revisou: a sessão de estudo precisa
// saber QUANDO o card vence para decidir se ele reaparece agora — antes ela o
// repetia na hora, ignorando o horário, e o "10 min" do botão não valia nada.
export interface SubmitReviewResult {
  success: boolean;
  schedule: ReviewSchedule | null;
}

export interface ReviewSchedule {
  fase: string;
  learningStep: number;
  intervalo: number;
  fatorEase: number;
  dificuldade: number;
  proximaRevisao: string;
  ultimaRevisao: string;
}

function toReviewSchedule(state: ScheduleState | null): ReviewSchedule | null {
  if (!state) return null;
  return {
    fase: state.fase,
    learningStep: state.learningStep,
    intervalo: state.intervalo,
    fatorEase: state.fatorEase,
    dificuldade: state.dificuldade,
    proximaRevisao: state.proximaRevisao.toISOString(),
    ultimaRevisao: state.ultimaRevisao.toISOString(),
  };
}

/**
 * Records a flashcard review and reschedules it (SM-2), atomically across the
 * StudySession and Flashcard aggregates. Returns the card's new schedule.
 * @example useCase.execute({ userId, flashcardId, grade: 'good', sessaoId })
 */
export class SubmitReviewUseCase {
  constructor(
    private readonly uow: StudyUnitOfWork,
    private readonly clock: Clock,
    private readonly plans: StudyPlanRepository,
  ) {}

  async execute(cmd: SubmitReviewCommand): Promise<SubmitReviewResult> {
    const grade = this.resolveGrade(cmd);
    const dataAlvo = await this.deadlineFor(cmd.userId);
    const state = await this.uow.execute((repos) => this.review(repos, cmd, grade, dataAlvo));
    return { success: true, schedule: toReviewSchedule(state) };
  }

  // Lido fora da transação de propósito: é uma leitura de configuração, não faz
  // parte do fato "revisou o card", e não deve segurar a transação de escrita.
  private async deadlineFor(userId: string): Promise<Date | null> {
    return nearestDeadline(await this.plans.listByUser(userId), this.clock.now());
  }

  private async review(
    repos: StudyRepositories,
    cmd: SubmitReviewCommand,
    grade: Grade,
    dataAlvo: Date | null,
  ): Promise<ScheduleState | null> {
    const { session, flashcard } = await this.loadAggregates(repos, cmd);

    session.recordReview({
      flashcardId: flashcard.id,
      grade,
      answer: cmd.respostaUsuario,
      responseTimeMs: cmd.tempoResposta,
    });
    flashcard.review(grade, this.clock.now(), dataAlvo);

    await repos.sessions.save(session);
    await repos.flashcards.save(flashcard);
    return flashcard.learningState;
  }

  // Both aggregates are loaded (and rejected) together so `review` stays about
  // the review itself.
  private async loadAggregates(
    repos: StudyRepositories,
    cmd: SubmitReviewCommand,
  ): Promise<{ session: StudySession; flashcard: Flashcard }> {
    const session = await repos.sessions.findActive(cmd.userId, cmd.sessaoId);
    if (!session) throw new NoActiveSessionError(cmd.userId);

    const flashcard = await repos.flashcards.findOwnedBy(cmd.flashcardId, cmd.userId);
    if (!flashcard) throw new CardNotFoundError(cmd.flashcardId);

    return { session, flashcard };
  }

  private resolveGrade(cmd: SubmitReviewCommand): Grade {
    if (cmd.grade) return Grade.create(cmd.grade);
    return Grade.fromLegacy(cmd.acertou ?? false, cmd.nivelConfianca ?? 0);
  }
}
