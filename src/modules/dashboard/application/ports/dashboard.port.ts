// Read-model port for the home dashboard. The infra/ adapter implements it over
// @/lib/content-api.
import type { SubjectWithTopics, StudySessionEntry, DueCandidate } from "../../domain/dashboard.types";

export interface DashboardPort {
  getSubjects(): Promise<SubjectWithTopics[]>;
  getSessionHistory(): Promise<StudySessionEntry[]>;
  getFlashcards(): Promise<DueCandidate[]>;
}
