import type {
  FlashcardStudyView,
  StudyFlashcardQuery,
} from '../../domain/ports/study-flashcard-query';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';

export interface StartSingleCardResult {
  sessionId: string | null;
  card: { id: string; pergunta: string; resposta: string; conceito: string | null };
  due: boolean;
  proximaRevisao: string | null;
  ultimaRevisao: string | null;
  fase: string;
  learningStep: number;
  intervalo: number;
  fatorEase: number;
  dificuldade: number;
}

/**
 * Prepares a single card for study: opens a session only when the card is due.
 * Returns null when the card does not belong to the user.
 * @example useCase.execute(userId, flashcardId)
 */
export class StartSingleCardStudyUseCase {
  constructor(
    private readonly cards: StudyFlashcardQuery,
    private readonly sessions: StudySessionRepository,
  ) {}

  async execute(userId: string, flashcardId: string): Promise<StartSingleCardResult | null> {
    const view = await this.cards.findForStudy(userId, flashcardId);
    if (!view) return null;

    const sessionId = view.due ? (await this.sessions.start(userId)).id : null;
    return { sessionId, ...toCardAndSchedule(view) };
  }
}

// A view mistura o card e seu agendamento; a resposta os separa (card aninhado,
// agendamento plano ao lado) — mas os campos são os mesmos.
function toCardAndSchedule(view: FlashcardStudyView): Omit<StartSingleCardResult, 'sessionId'> {
  return {
    card: {
      id: view.id,
      pergunta: view.pergunta,
      resposta: view.resposta,
      conceito: view.conceito,
    },
    due: view.due,
    proximaRevisao: view.proximaRevisao,
    ultimaRevisao: view.ultimaRevisao,
    fase: view.fase,
    learningStep: view.learningStep,
    intervalo: view.intervalo,
    fatorEase: view.fatorEase,
    dificuldade: view.dificuldade,
  };
}
