import { applyInterleaving } from '../../domain/services/interleaving';
import type { StudyCardQuery, StudyCardView } from '../../domain/ports/study-card-query';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';

// At most this many brand-new cards, and this many cards total, per session.
const MAX_NEW = 10;
const MAX_CARDS = 30;

export interface StartSessionResult {
  sessionId: string;
  cards: StudyCardView[];
}

/**
 * Opens a study session and assembles its card queue: due reviews first, then a
 * capped number of new cards, interleaved by concept.
 * @example useCase.execute(userId)
 */
export class StartSessionUseCase {
  constructor(
    private readonly sessions: StudySessionRepository,
    private readonly cards: StudyCardQuery,
  ) {}

  async execute(userId: string): Promise<StartSessionResult> {
    const session = await this.sessions.start(userId);
    const [due, fresh] = await Promise.all([
      this.cards.findDueCards(userId),
      this.cards.findNewCards(userId, MAX_NEW),
    ]);
    const cards = applyInterleaving([...due, ...fresh].slice(0, MAX_CARDS));
    return { sessionId: session.id, cards };
  }
}
