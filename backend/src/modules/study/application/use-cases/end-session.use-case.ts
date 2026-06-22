import type { StudySessionLifecycle } from '../../domain/ports/study-session-lifecycle';

/**
 * Marks a study session as ended.
 * @example useCase.execute(userId, sessionId)
 */
export class EndSessionUseCase {
  constructor(private readonly sessions: StudySessionLifecycle) {}

  async execute(userId: string, sessionId: string): Promise<{ success: boolean }> {
    await this.sessions.end(userId, sessionId);
    return { success: true };
  }
}
