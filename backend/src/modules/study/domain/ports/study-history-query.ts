import type { StudySessionSummary } from '../study-views';

// Read port for the user's recent study-session history (summarized).
export interface StudyHistoryQuery {
  listHistory(userId: string): Promise<StudySessionSummary[]>;
}

export const STUDY_HISTORY_QUERY = Symbol('STUDY_HISTORY_QUERY');
