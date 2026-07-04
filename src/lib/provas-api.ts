import { apiFetch, getToken } from "./api";
import type { AlternativaMultipla, TipoQuestao } from "./questions-api";

export interface ProvaListItem {
  id: string;
  titulo: string;
  descricao: string | null;
  totalQuestoes: number;
  dataCriacao: string;
}

export interface ProvaQuestaoItem {
  ordem: number;
  id: string;
  tipo: TipoQuestao;
  enunciado: string;
  alternativas: AlternativaMultipla[] | null;
  gabarito: string;
  explicacao: string | null;
  conceitoNome: string | null;
}

export interface ProvaDetail {
  id: string;
  titulo: string;
  descricao: string | null;
  dataCriacao: string;
  questoes: ProvaQuestaoItem[];
}

export interface CreateProvaInput {
  titulo: string;
  descricao?: string;
  questaoIds: string[];
}

export function listProvas(): Promise<ProvaListItem[]> {
  return apiFetch("/provas");
}

export function getProva(id: string): Promise<ProvaDetail> {
  return apiFetch(`/provas/${id}`);
}

export function createProva(data: CreateProvaInput): Promise<{ provaId: string }> {
  return apiFetch("/provas", { method: "POST", body: JSON.stringify(data) });
}

export function updateProva(id: string, data: Partial<CreateProvaInput>): Promise<{ success: boolean }> {
  return apiFetch(`/provas/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteProva(id: string): Promise<{ success: boolean }> {
  return apiFetch(`/provas/${id}`, { method: "DELETE" });
}

export interface ParsedQuestaoPreview {
  numero: number;
  enunciado: string;
  tipo: TipoQuestao;
  alternativas: AlternativaMultipla[] | null;
  gabarito: string;
  explicacao: string | null;
}

export interface ParseUploadResult {
  tituloSugerido: string | null;
  questoes: ParsedQuestaoPreview[];
}

export async function parseProvaUpload(
  provaFile: File,
  gabaritoFile?: File | null,
): Promise<ParseUploadResult> {
  const formData = new FormData();
  formData.append("prova", provaFile);
  // Gabarito é opcional: sem ele, o backend devolve gabarito "?" em cada questão.
  if (gabaritoFile) formData.append("gabarito", gabaritoFile);

  const base = (await import("./api")).resolveApiUrl();
  const token = getToken();
  const res = await fetch(`${base}/provas/parse-upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "Erro ao processar arquivos");
  }
  return res.json();
}

export interface CreateFromParsedInput {
  titulo: string;
  descricao?: string;
  questoes: ParsedQuestaoPreview[];
}

export function createProvaFromParsed(data: CreateFromParsedInput): Promise<{ provaId: string }> {
  return apiFetch("/provas/from-parsed", { method: "POST", body: JSON.stringify(data) });
}
