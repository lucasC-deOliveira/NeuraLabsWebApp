import type { StudyHistoryQuery } from '../../domain/ports/study-history-query';
import type { StudySessionSummary } from '../../domain/study-views';

/**
 * Returns the user's recent study-session history (summarized).
 * @example getStudyHistory.execute('u1')
 */
export class GetStudyHistoryUseCase {
  constructor(private readonly query: StudyHistoryQuery) {}

  execute(userId: string): Promise<StudySessionSummary[]> {
    return this.query.listHistory(userId);
  }
}
