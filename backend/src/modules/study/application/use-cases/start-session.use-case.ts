import { applyInterleaving } from '../../domain/services/interleaving';
import { orderByReadiness } from '../../domain/services/prerequisite-readiness';
import type { PrerequisiteMasteryQuery } from '../../domain/ports/prerequisite-mastery-query';
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
 * capped number of new cards, ordered so that what depends on a weak prerequisite
 * comes later, and interleaved by concept.
 * @example useCase.execute(userId)
 */
export class StartSessionUseCase {
  constructor(
    private readonly sessions: StudySessionRepository,
    private readonly cards: StudyCardQuery,
    private readonly prerequisites?: PrerequisiteMasteryQuery,
  ) {}

  async execute(userId: string): Promise<StartSessionResult> {
    const session = await this.sessions.start(userId);
    const [due, fresh] = await Promise.all([
      this.cards.findDueCards(userId),
      this.cards.findNewCards(userId, MAX_NEW),
    ]);
    const pool = [...due, ...fresh].slice(0, MAX_CARDS);
    return { sessionId: session.id, cards: await this.orderQueue(userId, pool) };
  }

  // Prontidão antes do interleaving: a prontidão escolhe a ORDEM GERAL (o que faz
  // sentido estudar agora) e o interleaving só evita repetir o mesmo conceito em
  // sequência. Invertido, o interleaving desfaria a ordenação.
  private async orderQueue(userId: string, pool: StudyCardView[]): Promise<StudyCardView[]> {
    if (!this.prerequisites) return applyInterleaving(pool);
    const conceitos = [...new Set(pool.flatMap((c) => (c.conceito ? [c.conceito] : [])))];
    const prereqs = await this.prerequisites.forConcepts(userId, conceitos);
    return applyInterleaving(orderByReadiness(pool, prereqs));
  }
}
