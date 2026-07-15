// Cliente de baralhos (decks) → API NestJS.
import { apiFetch } from "./api";

export interface BaralhoOrigin {
  grafoId: string;
  nome: string;
}

export interface BaralhoListItem {
  id: string;
  titulo: string;
  totalCards: number;
  novos: number;
  aprender: number;
  revisar: number;
  dataCriacao: Date;
  origens: BaralhoOrigin[];
}

export interface BaralhoCard {
  id: string;
  pergunta: string;
  resposta: string;
  tipo: string | null;
  conceito: string;
}

export interface BaralhoDetail {
  id: string;
  titulo: string;
  dataCriacao: Date;
  origens: BaralhoOrigin[];
  cards: BaralhoCard[];
}

type RawListItem = Omit<BaralhoListItem, "dataCriacao"> & { dataCriacao: string };
type RawDetail = Omit<BaralhoDetail, "dataCriacao"> & { dataCriacao: string };

export async function getBaralhos(): Promise<BaralhoListItem[]> {
  const rows = await apiFetch<RawListItem[]>("/baralhos");
  return rows.map((r) => ({ ...r, dataCriacao: new Date(r.dataCriacao) }));
}

export async function getBaralho(baralhoId: string): Promise<BaralhoDetail> {
  const row = await apiFetch<RawDetail>(`/baralhos/${baralhoId}`);
  return { ...row, dataCriacao: new Date(row.dataCriacao) };
}

export function createBaralho(titulo: string, flashcardIds: string[]): Promise<{ baralhoId: string }> {
  return apiFetch("/baralhos", { method: "POST", body: JSON.stringify({ titulo, flashcardIds }) });
}

export function renameBaralho(baralhoId: string, titulo: string): Promise<{ success: boolean }> {
  return apiFetch(`/baralhos/${baralhoId}`, { method: "PATCH", body: JSON.stringify({ titulo }) });
}

export function deleteBaralho(baralhoId: string): Promise<{ success: boolean }> {
  return apiFetch(`/baralhos/${baralhoId}`, { method: "DELETE" });
}

export function addCardsToBaralho(baralhoId: string, flashcardIds: string[]): Promise<{ success: boolean }> {
  return apiFetch(`/baralhos/${baralhoId}/cards`, { method: "POST", body: JSON.stringify({ flashcardIds }) });
}

export function removeCardFromBaralho(baralhoId: string, flashcardId: string): Promise<{ success: boolean }> {
  return apiFetch(`/baralhos/${baralhoId}/cards/${flashcardId}`, { method: "DELETE" });
}

export function importBaralhos(baralhos: unknown): Promise<{ count: number }> {
  return apiFetch("/baralhos/import", { method: "POST", body: JSON.stringify({ baralhos }) });
}
