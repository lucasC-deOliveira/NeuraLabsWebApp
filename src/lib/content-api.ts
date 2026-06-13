// Cliente de conteúdo (assuntos, flashcards, histórico de estudo) → API NestJS.
import { apiFetch } from "./api";

export interface SubjectWithTopics {
  id: string;
  nome: string;
  descricao: string | null;
  topicos: { id: string; nome: string }[];
}
export function getSubjects(): Promise<SubjectWithTopics[]> {
  return apiFetch<SubjectWithTopics[]>("/subjects");
}

export interface SpacedRepetition {
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
  estagioAprendizado: number;
}
export interface FlashcardListItem {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
  dataCriacao: Date;
  spacedRepetition: SpacedRepetition | null;
}
export async function getFlashcards(): Promise<FlashcardListItem[]> {
  const rows = await apiFetch<Array<Omit<FlashcardListItem, "dataCriacao" | "spacedRepetition"> & { dataCriacao: string; spacedRepetition: (Omit<SpacedRepetition, "proximaRevisao" | "ultimaRevisao"> & { proximaRevisao: string; ultimaRevisao: string }) | null }>>("/flashcards");
  return rows.map((r) => ({
    ...r,
    dataCriacao: new Date(r.dataCriacao),
    spacedRepetition: r.spacedRepetition
      ? { ...r.spacedRepetition, proximaRevisao: new Date(r.spacedRepetition.proximaRevisao), ultimaRevisao: new Date(r.spacedRepetition.ultimaRevisao) }
      : null,
  }));
}

export interface ConceptHierarchy {
  id: string;
  nome: string;
  topicos: { id: string; nome: string; conceitos: { id: string; nome: string }[] }[];
}
export function getConceptHierarchy(): Promise<ConceptHierarchy[]> {
  return apiFetch<ConceptHierarchy[]>("/subjects/hierarchy");
}

export function createFlashcard(data: { pergunta: string; resposta: string; conceitoId?: string | null }): Promise<{ flashcardId: string }> {
  return apiFetch("/flashcards", { method: "POST", body: JSON.stringify(data) });
}
export function updateFlashcard(id: string, data: { pergunta?: string; resposta?: string }): Promise<{ success: boolean }> {
  return apiFetch(`/flashcards/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}
export function deleteFlashcard(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/flashcards/${id}`, { method: "DELETE" });
}
export function deleteAllFlashcards(): Promise<{ count: number }> {
  return apiFetch("/flashcards", { method: "DELETE" });
}

export interface SubjectFilter {
  id: string;
  nome: string;
  topicos: { id: string; nome: string; assuntoId: string }[];
}
export function getFlashcardFilterData(): Promise<SubjectFilter[]> {
  return apiFetch<SubjectFilter[]>("/flashcards/filters");
}

export interface StudySession {
  id: string;
  dataInicio: Date;
  dataFim: Date | null;
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  avgConfidence: number;
}
export async function getStudySessionHistory(): Promise<StudySession[]> {
  const rows = await apiFetch<Array<Omit<StudySession, "dataInicio" | "dataFim"> & { dataInicio: string; dataFim: string | null }>>("/study/history");
  return rows.map((s) => ({ ...s, dataInicio: new Date(s.dataInicio), dataFim: s.dataFim ? new Date(s.dataFim) : null }));
}
