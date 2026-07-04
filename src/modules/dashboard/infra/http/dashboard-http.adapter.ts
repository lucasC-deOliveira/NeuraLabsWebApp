// ACL over @/lib/content-api (the read-model slice the dashboard needs).
import { getSubjects, getStudySessionHistory, getFlashcards } from "@/lib/content-api";
import type { DashboardPort } from "../../application/ports/dashboard.port";
import type { SubjectWithTopics, StudySessionEntry, DueCandidate } from "../../domain/dashboard.types";

export class HttpDashboardAdapter implements DashboardPort {
  getSubjects(): Promise<SubjectWithTopics[]> {
    return getSubjects();
  }

  getSessionHistory(): Promise<StudySessionEntry[]> {
    return getStudySessionHistory();
  }

  getFlashcards(): Promise<DueCandidate[]> {
    return getFlashcards();
  }
}
