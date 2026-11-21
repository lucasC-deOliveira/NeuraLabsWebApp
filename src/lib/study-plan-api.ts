// Borda HTTP do Plano de Estudo → backend NestJS (/study/plan*).
import { apiFetch } from "./api";

import type { PlannedSession, PlanScope, RoadmapOption, SaveStudyPlanInput, StudyPlan, TodayPlan } from "@/modules/study/application/study-plan.types";
export type * from "@/modules/study/application/study-plan.types";

export function getStudyPlans(): Promise<StudyPlan[]> {
  return apiFetch<StudyPlan[]>("/study/plans");
}

export function getGraphRoadmaps(grafoId: string): Promise<RoadmapOption[]> {
  return apiFetch<RoadmapOption[]>(`/study/plan/roadmaps?grafoId=${encodeURIComponent(grafoId)}`);
}

export function getPlanScope(grafoIds: string[]): Promise<PlanScope> {
  if (grafoIds.length === 0) return Promise.resolve({ hasProva: false, hasEdital: false });
  return apiFetch<PlanScope>(`/study/plan/scope?grafoIds=${encodeURIComponent(grafoIds.join(","))}`);
}

// Gera (ou recomputa) o roadmap de um critério, para o plano poder segui-lo mesmo que
// ele ainda não exista. Determinístico (0 token) para prova/edital; a IA ordena no 'ai'.
export function buildRoadmap(grafoId: string, modo: string): Promise<{ itens: unknown[] }> {
  return apiFetch<{ itens: unknown[] }>(`/ai/graphs/${grafoId}/roadmap`, {
    method: "POST",
    body: JSON.stringify({ modo }),
  });
}

export function getTodayPlan(planId: string): Promise<TodayPlan | null> {
  return apiFetch<TodayPlan | null>(`/study/plan/${planId}/today`);
}

export function saveStudyPlan(input: SaveStudyPlanInput): Promise<StudyPlan> {
  return apiFetch<StudyPlan>("/study/plan", { method: "POST", body: JSON.stringify(input) });
}

export function startPlannedSession(planId: string): Promise<PlannedSession | null> {
  return apiFetch<PlannedSession | null>(`/study/plan/${planId}/session`, { method: "POST" });
}

export function deleteStudyPlan(planId: string): Promise<void> {
  return apiFetch<void>(`/study/plan/${planId}`, { method: "DELETE" });
}
