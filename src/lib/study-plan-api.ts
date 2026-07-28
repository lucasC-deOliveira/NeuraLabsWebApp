// Borda HTTP do Plano de Estudo → backend NestJS (/study/plan*).
import { apiFetch } from "./api";

export type PlanMetaTipo = "TEMPO" | "NOVOS";
export type PlanPrioridade = "prova" | "edital" | "prova_edital" | "ai";

export interface StudyPlan {
  id: string;
  grafoId: string;
  prioridade: string; // pode vir com escopo dobrado: "prova|p:<id>"
  metaTipo: PlanMetaTipo;
  metaValor: number;
  dataAlvo: string | null; // ISO ou null (sem prazo)
  ativo: boolean;
  baralhoIds: string[];
  provaIds: string[];
  conceitosExcluidos: string[];
}

export interface DailyTarget {
  reviews: number;
  feynman: number;
  novos: number;
  estMinutes: number;
  note: string | null;
}

export interface PlanProjection {
  projectedFinish: string | null;
  daysNeeded: number | null;
  onTrack: boolean | null;
  suggestedPerDay: number | null;
}

export interface TodayPlan {
  plan: StudyPlan;
  target: DailyTarget;
  projection: PlanProjection;
  newAvailable: number;
}

// A sessão do dia mistura flashcards e questões (prática); `kind` discrimina.
export interface FlashcardItem {
  kind: "flashcard";
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
}

export interface QuestionItem {
  kind: "question";
  id: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[] | null;
  gabarito: string;
  explicacao: string | null;
  conceito: string | null;
}

export type PlannedItem = FlashcardItem | QuestionItem;

export interface PlannedSession {
  sessionId: string;
  items: PlannedItem[];
}

export interface SaveStudyPlanInput {
  grafoId: string;
  prioridade: string;
  metaTipo: PlanMetaTipo;
  metaValor: number;
  dataAlvo: string | null;
  baralhoIds: string[];
  provaIds: string[];
  conceitosExcluidos: string[];
}

// Um escopo/roadmap que o plano pode seguir (uma opção por trilha do grafo).
export interface RoadmapOption {
  modo: string;
  label: string;
}

export function getStudyPlans(): Promise<StudyPlan[]> {
  return apiFetch<StudyPlan[]>("/study/plans");
}

export function getGraphRoadmaps(grafoId: string): Promise<RoadmapOption[]> {
  return apiFetch<RoadmapOption[]>(`/study/plan/roadmaps?grafoId=${encodeURIComponent(grafoId)}`);
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
