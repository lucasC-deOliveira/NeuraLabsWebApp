import type {
  FlashcardItem, PlanScope, PlannedSession, SaveStudyPlanInput, StudyPlan, TodayPlan,
} from "./study-plan.types";
import type { ReviewGrade } from "@/lib/srs-local";

export interface VaultPlanOption { id: string; titulo: string }
export interface VaultPlanGraph { id: string; nome: string }

export interface VaultPlanSetupPort {
  scope(graphIds: string[]): Promise<PlanScope>;
  sources(): Promise<{ decks: VaultPlanOption[]; exams: VaultPlanOption[] }>;
  save(input: SaveStudyPlanInput): Promise<StudyPlan>;
}

export interface VaultPlanStudyPort extends VaultPlanSetupPort {
  graphs(): Promise<VaultPlanGraph[]>;
  list(): Promise<StudyPlan[]>;
  remove(id: string): Promise<void>;
  today(id: string): Promise<TodayPlan | null>;
  start(id: string): Promise<PlannedSession | null>;
  grade(sessionId: string, card: FlashcardItem, grade: ReviewGrade): Promise<void>;
  advance(sessionId: string, index: number, answer?: string): Promise<void>;
}
