import type { StudySessionLifecycle } from '../../domain/ports/study-session-lifecycle';

/**
 * Finalizes a study session: discards it if it recorded no reviews, otherwise
 * marks it ended. Returns success=false when the session does not exist.
 * @example useCase.execute(userId, sessionId)
 */
export class FinalizeSessionUseCase {
  constructor(private readonly sessions: StudySessionLifecycle) {}

  async execute(userId: string, sessionId: string): Promise<{ success: boolean }> {
    const summary = await this.sessions.findSummary(userId, sessionId);
    if (!summary) return { success: false };

    if (summary.reviewCount === 0) await this.sessions.delete(summary.id);
    else if (!summary.endedAt) await this.sessions.end(userId, sessionId);

    return { success: true };
  }
}
