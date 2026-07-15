import { apiFetch, getToken } from "./api";
import type { AlternativaMultipla, TipoQuestao } from "./questions-api";

export interface ProvaListItem {
  id: string;
  titulo: string;
  descricao: string | null;
  totalQuestoes: number;
  dataCriacao: string;
}

export interface ProvaImagemRef {
  id: string;
  ordem: number;
  mimetype: string;
  alternativa: string | null;
}

// Tag de um conceito que a questão testa no grafo, com os pais.
export interface ProvaConceptTag {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
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
  conceitosConectados: ProvaConceptTag[];
  imagens: ProvaImagemRef[];
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

export interface ParsedImagemPreview {
  mimetype: string;
  base64: string;
  alternativa: string | null;
}

// Um conceito do grafo que a questão avalia. `conceitoId` é o id do nó existente
// quando o nome casa com o grafo do usuário, ou null quando é um conceito novo.
export interface ConceitoSugeridoPreview {
  nome: string;
  conceitoId: string | null;
}

export interface ParsedQuestaoPreview {
  numero: number;
  enunciado: string;
  tipo: TipoQuestao;
  alternativas: AlternativaMultipla[] | null;
  gabarito: string;
  explicacao: string | null;
  imagens?: ParsedImagemPreview[];
  conceitos?: ConceitoSugeridoPreview[];
}

export interface QuestaoConceitosPreview {
  numero: number;
  conceitos: ConceitoSugeridoPreview[];
}

export interface ParseUploadResult {
  tituloSugerido: string | null;
  questoes: ParsedQuestaoPreview[];
}

export async function parseProvaUpload(
  provaFile: File,
  gabaritoFile?: File | null,
  aiExtraction = true,
): Promise<ParseUploadResult> {
  const formData = new FormData();
  formData.append("prova", provaFile);
  // Gabarito é opcional: sem ele, o backend devolve gabarito "?" em cada questão.
  if (gabaritoFile) formData.append("gabarito", gabaritoFile);
  // Desligar = extração só determinística (0 token de LLM) no backend.
  if (!aiExtraction) formData.append("aiExtraction", "false");

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

// The figure endpoint is JWT-guarded, so an <img src> (no Authorization header)
// can't load it. Fetch the bytes with the Bearer token and hand back a Blob the
// caller can turn into an object URL.
export async function fetchProvaImagem(imagemId: string): Promise<Blob> {
  const base = (await import("./api")).resolveApiUrl();
  const token = getToken();
  const res = await fetch(`${base}/provas/imagens/${imagemId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Erro ao carregar imagem da questão");
  return res.blob();
}

export interface CreateFromParsedInput {
  titulo: string;
  descricao?: string;
  questoes: ParsedQuestaoPreview[];
  // Quando presente, as questões são ligadas a este grafo pelos conceitos de cada
  // questão (QUESTION node → arestas TESTA).
  grafoId?: string;
}

export function createProvaFromParsed(data: CreateFromParsedInput): Promise<{ provaId: string }> {
  return apiFetch("/provas/from-parsed", { method: "POST", body: JSON.stringify(data) });
}

// Sugere, por questão, os conceitos do grafo que ela avalia (reusa nós existentes,
// propõe novos), para o usuário confirmar na revisão antes de gravar as ligações.
export function suggestProvaConceitos(
  questoes: ParsedQuestaoPreview[],
): Promise<QuestaoConceitosPreview[]> {
  return apiFetch("/provas/suggest-conceitos", {
    method: "POST",
    body: JSON.stringify({ questoes }),
  });
}

// Edital como nó vinculado 1:1 a uma prova (nó EDITAL + aresta REGE).
export interface CreateEditalInput {
  titulo: string;
  programa: string;
  grafoId: string;
  provaId?: string;
  conceitoNodeIds?: string[];
}
export interface EditalItem {
  id: string;
  titulo: string;
  provaId: string | null;
}

export function createEditalNode(data: CreateEditalInput): Promise<{ editalId: string }> {
  return apiFetch("/provas/editais", { method: "POST", body: JSON.stringify(data) });
}

export function linkEditalToProva(
  editalId: string,
  provaId: string,
  grafoId: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/provas/editais/${editalId}/link`, {
    method: "POST",
    body: JSON.stringify({ provaId, grafoId }),
  });
}

export function listEditais(): Promise<EditalItem[]> {
  return apiFetch("/provas/editais");
}
