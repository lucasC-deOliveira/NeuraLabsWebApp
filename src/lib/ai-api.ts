// Features de IA do grafo → API NestJS.
import { apiFetch } from "./api";

export interface NotaRelationSuggestion {
  nodeId: string;
  nodeTipo: "ASSUNTO" | "TOPICO" | "CONCEITO";
  nodeNome: string;
  relacao: string;
  motivo: string;
}
export interface NodeInsight {
  categoria: string;
  titulo: string;
  descricao: string;
  tipoNo: string;
  relacao: string;
}
export interface NodeInsightsResult {
  nodeNome: string;
  nodeTipo: string;
  insights: NodeInsight[];
}

export function suggestNotaRelations(grafoId: string, titulo: string, conteudo: string): Promise<NotaRelationSuggestion[]> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/nota-relations`, { method: "POST", body: JSON.stringify({ titulo, conteudo }) });
}

import type { FlashcardPreview } from "./content-api";
export function generateFlashcardsViaIA(notaId: string): Promise<FlashcardPreview[]> {
  return apiFetch(`/ai/graph/notas/${notaId}/flashcards`, { method: "POST" });
}

export interface NotaCandidata {
  titulo: string;
  conteudo: string;
  conceitosPrevistos: string[];
  conceitosDetalhe?: Array<{ nome: string }>;
}
export async function analyzeRawText(rawText: string): Promise<{ candidatas: NotaCandidata[] }> {
  return apiFetch("/ai/graph/notas/analyze", { method: "POST", body: JSON.stringify({ rawText }) });
}
export function saveSelectedNotas(candidatas: Array<{ titulo: string; conteudo: string }>): Promise<{ notaIds: string[] }> {
  return apiFetch("/ai/graph/notas/save", { method: "POST", body: JSON.stringify({ candidatas }) });
}

export function generateNodeInsights(grafoId: string, nodeId: string): Promise<NodeInsightsResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/nodes/${nodeId}/insights`, { method: "POST" });
}

export function suggestGapFill(
  grafoId: string,
  body: { labelsA: string[]; labelsB: string[]; bridgeA: string; bridgeB: string },
): Promise<{ insights: NodeInsight[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/gap-suggestions`, { method: "POST", body: JSON.stringify(body) });
}

export interface GenerateGraphResult {
  assunto: string;
  topicos: number;
  conceitos: number;
  notas: number;
  flashcards: number;
  baralho: string | null;
}
export function generateGraphFromText(grafoId: string, rawText: string): Promise<GenerateGraphResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/generate-graph`, { method: "POST", body: JSON.stringify({ rawText }) });
}
export function planGraphFromText(grafoId: string, rawText: string): Promise<{ plan: any }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/generate-graph/plan`, { method: "POST", body: JSON.stringify({ rawText }) });
}
export function buildGraphFromPlan(grafoId: string, rawText: string, plan: any, saveBruto = true): Promise<GenerateGraphResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/generate-graph/build`, { method: "POST", body: JSON.stringify({ rawText, plan, saveBruto }) });
}

export interface BaralhoItem { id: string; titulo: string; flashcardCount: number; }
export interface PopulateFromBaralhoResult { assuntos: number; topicos: number; conceitos: number; baralhoNome: string; }
export function listBaralhosInGrafo(grafoId: string): Promise<BaralhoItem[]> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/baralhos`, { method: "POST" });
}
export function populateGraphFromBaralho(grafoId: string, baralhoId: string): Promise<PopulateFromBaralhoResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/baralhos/${baralhoId}/populate`, { method: "POST" });
}

export function addInsightsToGraph(
  grafoId: string,
  sourceNodeId: string,
  insights: Array<{ tipoNo: string; relacao: string; titulo: string; descricao?: string }>,
): Promise<{ added: number }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/nodes/${sourceNodeId}/insights/add`, { method: "POST", body: JSON.stringify({ insights }) });
}

// ── Auto-link ──────────────────────────────────────────────────────────────
export interface AutoLinkSuggestion {
  sourceId: string;
  targetId: string;
  sourceNome: string;
  targetNome: string;
  relacao: string;
  motivo: string;
}
export function autoLinkGraph(grafoId: string): Promise<{ suggestions: AutoLinkSuggestion[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/auto-link`, { method: "POST" });
}
export function applyAutoLink(
  grafoId: string,
  edges: Array<{ sourceId: string; targetId: string; relacao: string }>,
): Promise<{ added: number }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/auto-link/apply`, { method: "POST", body: JSON.stringify({ edges }) });
}

// ── Duplicatas ─────────────────────────────────────────────────────────────
export interface DuplicateNode { id: string; nome: string; tipo: string; }
export interface DuplicateGroup { nodes: DuplicateNode[]; sugestao: string; }
export function detectDuplicates(grafoId: string): Promise<{ groups: DuplicateGroup[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/detect-duplicates`, { method: "POST" });
}

// ── Expansão de nó ─────────────────────────────────────────────────────────
export function expandNode(
  grafoId: string,
  nodeId: string,
): Promise<{ topicos: number; conceitos: number; notas: number; flashcards: number }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/nodes/${nodeId}/expand`, { method: "POST" });
}

// ── Resumo de comunidade ───────────────────────────────────────────────────
export function generateCommunitySummary(
  grafoId: string,
  nodeIds: string[],
): Promise<{ titulo: string; resumo: string }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/community-summary`, { method: "POST", body: JSON.stringify({ nodeIds }) });
}

// ── Pré-requisitos faltantes ───────────────────────────────────────────────
export interface MissingPrereq {
  nome: string;
  tipo: string;
  motivo: string;
  shouldConnectTo: Array<{ id: string; nome: string }>;
}
export function detectMissingPrerequisites(grafoId: string): Promise<{ prerequisites: MissingPrereq[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/missing-prerequisites`, { method: "POST" });
}
export function addMissingPrerequisite(
  grafoId: string,
  nome: string,
  tipo: string,
  connectToIds: string[],
): Promise<{ nodeId: string }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/missing-prerequisites/add`, { method: "POST", body: JSON.stringify({ nome, tipo, connectToIds }) });
}

// ── Trilha de aprendizado ──────────────────────────────────────────────────
export interface LearningStep { nodeId: string; nome: string; tipo: string; motivo: string; }
export function generateLearningPath(grafoId: string): Promise<{ steps: LearningStep[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/learning-path`, { method: "POST" });
}

// ── Chat com o grafo ───────────────────────────────────────────────────────
export interface ChatHistoryItem { role: "user" | "assistant"; content: string; }
export interface ChatReferencedNode { id: string; nome: string; tipo: string; }
export function chatWithGraph(
  grafoId: string,
  question: string,
  history: ChatHistoryItem[],
): Promise<{ answer: string; referencedNodes: ChatReferencedNode[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/chat`, { method: "POST", body: JSON.stringify({ question, history }) });
}

// ── Avaliação de completude ────────────────────────────────────────────────
export interface CompletenessAssessment {
  assuntoId: string;
  assuntoNome: string;
  score: number;
  wellCovered: string[];
  shallow: string[];
  missing: string[];
}
export function assessCompleteness(grafoId: string): Promise<{ assessments: CompletenessAssessment[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/assess-completeness`, { method: "POST" });
}

export interface GapItem { nome: string; tipo: "missing" | "shallow"; assuntoId: string; assuntoNome: string; }
export function fillKnowledgeGaps(
  grafoId: string,
  gaps: GapItem[],
): Promise<{ topicos: number; conceitos: number; notas: number; flashcards: number }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/fill-gaps`, { method: "POST", body: JSON.stringify({ gaps }) });
}

// ── Merge de duplicatas ────────────────────────────────────────────────────
export function mergeDuplicates(
  grafoId: string,
  keepId: string,
  deleteIds: string[],
): Promise<{ merged: number; edgesMoved: number }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/merge-duplicates`, { method: "POST", body: JSON.stringify({ keepId, deleteIds }) });
}
