import type { StudySession } from '../entities/study-session';

// Persistence port for the StudySession aggregate (session + its reviews).
export interface StudySessionRepository {
  findActive(userId: string, sessionId?: string): Promise<StudySession | null>;
  // Persists the reviews recorded on the aggregate during this unit of work.
  save(session: StudySession): Promise<void>;
}

export const STUDY_SESSION_REPOSITORY = Symbol('STUDY_SESSION_REPOSITORY');
