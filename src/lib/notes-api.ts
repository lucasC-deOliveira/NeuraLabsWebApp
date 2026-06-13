// Notas → API NestJS.
import { apiFetch } from "./api";

export interface NotaListItem {
  id: string;
  titulo: string;
  preview: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; id: string }[];
  flashcardCount: number;
  wordCount: number;
}
export async function getNotas(): Promise<NotaListItem[]> {
  const rows = await apiFetch<Array<Omit<NotaListItem, "dataCriacao"> & { dataCriacao: string }>>("/notes");
  return rows.map((n) => ({ ...n, dataCriacao: new Date(n.dataCriacao) }));
}

export interface NotaDetail {
  id: string;
  conteudo: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; tipoRelacao: string }[];
}
export async function getNotaById(notaId: string): Promise<NotaDetail | null> {
  const n = await apiFetch<(Omit<NotaDetail, "dataCriacao"> & { dataCriacao: string }) | null>(`/notes/${notaId}`);
  return n ? { ...n, dataCriacao: new Date(n.dataCriacao) } : null;
}

export function createNotaManual(input: {
  titulo: string;
  conteudo: string;
  selectedConceitoIds?: string[];
  notaConceitoRels?: Array<{ conceitoId: string; tipoRelacao: string }>;
  conceitoConceitoRels?: Array<{ origemId: string; destinoId: string; tipoRelacao: string }>;
}): Promise<{ notaId: string }> {
  return apiFetch("/notes", { method: "POST", body: JSON.stringify({ titulo: input.titulo, conteudo: input.conteudo }) });
}

export function generateFlashcardsFromNota(notaId: string): Promise<{ flashcards: { id: string; pergunta: string }[] }> {
  return apiFetch(`/notes/${notaId}/flashcards`, { method: "POST" });
}

export function deleteNota(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/notes/${id}`, { method: "DELETE" });
}
export function deleteAllNotas(): Promise<{ count: number }> {
  return apiFetch("/notes", { method: "DELETE" });
}
export function getNotasFilterData(): Promise<Array<{ id: string; nome: string }>> {
  return apiFetch("/notes/filters");
}
