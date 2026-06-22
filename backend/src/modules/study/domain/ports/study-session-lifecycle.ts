// Lifecycle operations on an existing study session, separate from the
// aggregate write port (ISP): used by end/finalize, not by the review flow.
export interface StudySessionSummary {
  id: string;
  endedAt: Date | null;
  reviewCount: number;
}

export interface StudySessionLifecycle {
  findSummary(userId: string, sessionId: string): Promise<StudySessionSummary | null>;
  // Marks the session as ended (no-op if it does not belong to the user).
  end(userId: string, sessionId: string): Promise<void>;
  delete(sessionId: string): Promise<void>;
}

export const STUDY_SESSION_LIFECYCLE = Symbol('STUDY_SESSION_LIFECYCLE');
