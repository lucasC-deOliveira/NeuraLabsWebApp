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

export function addInsightsToGraph(
  grafoId: string,
  sourceNodeId: string,
  insights: Array<{ tipoNo: string; relacao: string; titulo: string; descricao?: string }>,
): Promise<{ added: number }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/nodes/${sourceNodeId}/insights/add`, { method: "POST", body: JSON.stringify({ insights }) });
}
