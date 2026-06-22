import type { StudyCardView } from '../../domain/ports/study-card-query';
import type { StudyDeckQuery } from '../../domain/ports/study-deck-query';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';

export interface StartDeckResult {
  sessionId: string;
  titulo: string;
  cards: StudyCardView[];
  totalNoDeck: number;
}

/**
 * Opens a study session for a deck and returns its due cards. Returns null when
 * the deck does not belong to the user.
 * @example useCase.execute(userId, baralhoId)
 */
export class StartDeckStudyUseCase {
  constructor(
    private readonly decks: StudyDeckQuery,
    private readonly sessions: StudySessionRepository,
  ) {}

  async execute(userId: string, baralhoId: string): Promise<StartDeckResult | null> {
    const deck = await this.decks.findDeckForStudy(userId, baralhoId);
    if (!deck) return null;

    const session = await this.sessions.start(userId);
    return {
      sessionId: session.id,
      titulo: deck.titulo,
      cards: deck.cards,
      totalNoDeck: deck.totalNoDeck,
    };
  }
}
