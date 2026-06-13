// Cliente do grafo: mesmas assinaturas das antigas server actions, mas chamando
// a API NestJS. Components/hooks só trocam o import (@/actions/graph → @/lib/graph-api).
import { apiFetch } from "./api";

export interface GraphNodeType {
  id: string;
  label: string;
  type: string;
  nivelDominio: number;
  prioridadeRevisao: number;
  parentId?: string;
  pergunta?: string;
  posicaoX?: number;
  posicaoY?: number;
}
export interface GraphEdgeType {
  source: string;
  target: string;
  type: string;
  peso: number;
}
export interface EdgeView {
  id: string;
  source: string;
  target: string;
  tipoRelacao: string;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}
export interface GrafoInfo {
  id: string;
  nome: string;
  descricao?: string | null;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

const qs = (params: Record<string, string | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
};

// ---- Grafos ----
export function listUserGraphs(): Promise<GrafoInfo[]> {
  return apiFetch<GrafoInfo[]>("/graph/graphs");
}
export function createGrafo(nome: string, descricao?: string): Promise<{ id: string }> {
  return apiFetch("/graph/graphs", { method: "POST", body: JSON.stringify({ nome, descricao }) });
}
export async function deleteGrafo(grafoId: string): Promise<void> {
  await apiFetch(`/graph/graphs/${grafoId}`, { method: "DELETE" });
}
export function getGrafoInfo(grafoId: string): Promise<{ nome: string; descricao?: string } | null> {
  return apiFetch(`/graph/graphs/${grafoId}/info`);
}
export async function updateGrafoNome(grafoId: string, nome: string): Promise<void> {
  await apiFetch(`/graph/graphs/${grafoId}`, { method: "PATCH", body: JSON.stringify({ nome }) });
}
export async function saveGraphVisualState(grafoId: string, state: unknown): Promise<void> {
  await apiFetch(`/graph/graphs/${grafoId}/visual`, { method: "PUT", body: JSON.stringify({ state }) });
}
export interface GraphVisualState {
  zoom: number;
  pan: { x: number; y: number };
  positions?: Record<string, { x: number; y: number }>;
}
export function loadGraphVisualState(grafoId: string): Promise<GraphVisualState | null> {
  return apiFetch(`/graph/graphs/${grafoId}/visual`);
}

// ---- Leitura ----
export function getGraphNodes(grafoId?: string): Promise<{ nodes: GraphNodeType[]; edges: GraphEdgeType[] }> {
  return apiFetch(`/graph${qs({ grafoId })}`);
}
export function getGraphEdges(grafoId: string): Promise<EdgeView[]> {
  return apiFetch(`/graph/edges${qs({ grafoId })}`);
}

// ---- Nós ----
export function addNodeToGraph(grafoId: string, tipoNode: string, data: Record<string, unknown>): Promise<{ success: boolean; nodeId: string }> {
  // entidade existente → só vincula; nova → cria
  if (data.entityId) {
    return apiFetch(`/graph/graphs/${grafoId}/nodes/link`, { method: "POST", body: JSON.stringify({ tipoNode, entityId: data.entityId }) });
  }
  return apiFetch(`/graph/graphs/${grafoId}/nodes`, { method: "POST", body: JSON.stringify({ tipoNode, ...data }) });
}

export function createBaralhoNode(grafoId: string, titulo: string, flashcardIds: string[]): Promise<{ success: boolean; nodeId: string }> {
  return apiFetch(`/graph/graphs/${grafoId}/baralho`, { method: "POST", body: JSON.stringify({ titulo, flashcardIds }) });
}

export interface AvailableItem {
  id: string;
  label: string;
  fullText: string;
  tipo: string;
  hierarquia: string;
  conceitoId?: string | null;
}
export function getAvailableItems(grafoId: string): Promise<{ flashcards: AvailableItem[]; notas: AvailableItem[] }> {
  return apiFetch(`/graph/available-items${qs({ grafoId })}`);
}

export function listUserFlashcards(): Promise<Array<{ id: string; pergunta: string; conceito: string | null }>> {
  return apiFetch("/graph/flashcards");
}
export function updateGraphNode(
  tipoNode: string,
  referenciaId: string,
  data: Record<string, unknown>,
  // grafoId mantido por compatibilidade de assinatura (não usado no backend)
  _grafoId?: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/graph/nodes/${referenciaId}`, { method: "PATCH", body: JSON.stringify({ tipoNode, ...data }) });
}
export function deleteGraphNode(graphNodeId: string, grafoId?: string): Promise<{ success: boolean; deletedType?: string }> {
  const refId = graphNodeId.includes(":") ? graphNodeId.slice(graphNodeId.indexOf(":") + 1) : graphNodeId;
  return apiFetch(`/graph/nodes/${refId}${qs({ grafoId })}`, { method: "DELETE" });
}
export function getNodeDetails(tipoNode: string, referenciaId: string): Promise<Record<string, string | null> | null> {
  return apiFetch(`/graph/nodes/${referenciaId}/details${qs({ tipoNode })}`);
}
// remove só o vínculo com o grafo (mantém a entidade)
export async function removeNodeFromGraph(graphNodeId: string, grafoId: string): Promise<{ success: boolean }> {
  const refId = graphNodeId.includes(":") ? graphNodeId.slice(graphNodeId.indexOf(":") + 1) : graphNodeId;
  await apiFetch(`/graph/graphs/${grafoId}/nodes/${refId}`, { method: "DELETE" });
  return { success: true };
}

// ---- Arestas ----
export function createEdge(
  grafoId: string,
  data: { sourceNodeId: string; targetNodeId: string; tipoRelacao: string; peso?: number },
): Promise<{ success: boolean; edgeId: string }> {
  return apiFetch(`/graph/graphs/${grafoId}/edges`, { method: "POST", body: JSON.stringify(data) }).then(
    (r: any) => ({ success: true, edgeId: r.edgeId }),
  );
}
export async function updateEdge(edgeId: string, grafoId: string, data: { tipoRelacao?: string; peso?: number }): Promise<{ success: boolean }> {
  await apiFetch(`/graph/graphs/${grafoId}/edges/${edgeId}`, { method: "PATCH", body: JSON.stringify(data) });
  return { success: true };
}
export async function deleteEdge(edgeId: string, grafoId: string): Promise<{ success: boolean }> {
  await apiFetch(`/graph/graphs/${grafoId}/edges/${edgeId}`, { method: "DELETE" });
  return { success: true };
}

// ---- Busca por conteúdo (devolve refIds que casam) ----
export function searchGraphNodeContent(grafoId: string, query: string): Promise<string[]> {
  return apiFetch<string[]>(`/graph/search${qs({ grafoId, q: query })}`);
}

// ---- Import JSON ----
export interface ImportGraphNode {
  ref: string;
  tipo: string;
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
}
export interface ImportGraphEdge {
  origem: string;
  destino: string;
  relacao: string;
  peso?: number;
}
export interface ImportGraphPayload {
  nodes: ImportGraphNode[];
  edges: ImportGraphEdge[];
}
export function importGraph(grafoId: string, payload: ImportGraphPayload): Promise<{ nodes: number; edges: number; reused: number }> {
  return apiFetch(`/graph/graphs/${grafoId}/import`, { method: "POST", body: JSON.stringify(payload) });
}

// Export no mesmo formato do import, com posição/nível (usado pelo vault/Pull).
export interface ExportGraphNode extends ImportGraphNode {
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
}
export interface ExportGraphPayload {
  grafo: { id: string; nome: string };
  nodes: ExportGraphNode[];
  edges: ImportGraphEdge[];
}
export function exportGraph(grafoId: string): Promise<ExportGraphPayload> {
  return apiFetch(`/graph/graphs/${grafoId}/export`);
}

// Sync por id (Push do vault): upsert de conteúdo + substitui arestas.
export function syncGraphFromVault(grafoId: string, payload: { nodes: ExportGraphNode[]; edges: ImportGraphEdge[] }): Promise<{ created: number; updated: number; edges: number; removed: number }> {
  return apiFetch(`/graph/graphs/${grafoId}/sync`, { method: "POST", body: JSON.stringify(payload) });
}

// ---- Posições ----
export async function saveGraphPositions(grafoId: string, positions: Record<string, { x: number; y: number }>): Promise<void> {
  await apiFetch(`/graph/graphs/${grafoId}/positions`, { method: "POST", body: JSON.stringify({ positions }) });
}

// ---- Baralho (visualização) ----
export function getDeckForStudy(baralhoId: string): Promise<{
  titulo: string;
  cards: { id: string; pergunta: string; resposta: string; conceito: string | null }[];
} | null> {
  return apiFetch(`/graph/baralho/${baralhoId}/study`);
}
