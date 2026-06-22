import { apiFetch } from "./api";

export type TipoQuestao = "VERDADEIRO_FALSO" | "MULTIPLA_ESCOLHA";

export interface AlternativaMultipla {
  letra: string;
  texto: string;
}

export interface QuestaoListItem {
  id: string;
  tipo: TipoQuestao;
  enunciado: string;
  gabarito: string;
  explicacao: string | null;
  alternativas: AlternativaMultipla[] | null;
  conceitoId: string | null;
  conceitoNome: string | null;
  dataCriacao: string;
}

export interface CreateQuestaoInput {
  tipo: TipoQuestao;
  enunciado: string;
  alternativas?: AlternativaMultipla[];
  gabarito: string;
  explicacao?: string;
  conceitoId?: string | null;
}

export function listQuestoes(): Promise<QuestaoListItem[]> {
  return apiFetch("/questions");
}

export function getQuestao(id: string): Promise<QuestaoListItem> {
  return apiFetch(`/questions/${id}`);
}

export function createQuestao(data: CreateQuestaoInput): Promise<{ questaoId: string }> {
  return apiFetch("/questions", { method: "POST", body: JSON.stringify(data) });
}

export function updateQuestao(id: string, data: Partial<CreateQuestaoInput>): Promise<{ success: boolean }> {
  return apiFetch(`/questions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteQuestao(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/questions/${id}`, { method: "DELETE" });
}
