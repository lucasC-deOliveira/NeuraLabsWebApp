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

export interface FlashcardListItem {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
  dataCriacao: string;
  spacedRepetition: {
    dificuldade: number;
    intervalo: number;
    proximaRevisao: string;
    ultimaRevisao: string;
    estagioAprendizado: number;
  } | null;
}
export function getFlashcards(): Promise<FlashcardListItem[]> {
  return apiFetch<FlashcardListItem[]>("/flashcards");
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
