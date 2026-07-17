// Features de IA do grafo → API NestJS.
import { apiFetch, getToken } from "./api";

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

export function generateNodeInsights(
  grafoId: string,
  nodeId: string,
  refresh = false,
): Promise<NodeInsightsResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/nodes/${nodeId}/insights`, {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
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

export interface EditalBuildResult {
  assuntos: number;
  topicos: number;
  conceitos: number;
  // Node ids of the concepts the edital covers (to link the EDITAL node via COBRE).
  conceitoNodeIds: string[];
}

export interface RankedConceitoView {
  conceitoId: string;
  nome: string;
  importancia: number;
  provaFreq: number;
  editalPeso: number;
}

// Sobe o PDF do edital e devolve o plano (hierarquia disciplina→tópico→subtópico),
// reusando os nós existentes. Multipart (não é JSON), com o token JWT.
export async function planGraphFromEdital(grafoId: string, edital: File): Promise<{ plan: any; programa: string }> {
  const form = new FormData();
  form.append("edital", edital);
  const base = (await import("./api")).resolveApiUrl();
  const token = getToken();
  const res = await fetch(`${base}/ai/graph/graphs/${grafoId}/edital/plan`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "Erro ao processar o edital");
  }
  return res.json();
}

export function buildGraphFromEdital(grafoId: string, plan: any): Promise<EditalBuildResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/edital/build`, { method: "POST", body: JSON.stringify({ plan }) });
}

// Ranqueia os conceitos por importância (frequência em provas × ênfase do edital).
export function rankGraphImportance(grafoId: string, provaWeight?: number): Promise<{ conceitos: RankedConceitoView[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/importance`, { method: "POST", body: JSON.stringify({ provaWeight }) });
}

export interface TokenUsageView {
  prompt: number;
  completion: number;
  total: number;
  calls: number;
}

export type RoadmapMode = "ai" | "prova" | "edital" | "prova_edital";
export interface RoadmapStep {
  nodeId: string;
  nome: string;
  tipo: string;
  motivo: string;
  provaFreq?: number;
}
export interface RoadmapBuildResult {
  itens: RoadmapStep[];
  dataGeracao: string;
  novos: number;
}

// Builds/persists the roadmap for a mode; server recomputes only the delta. provaId
// and editalId scope the prova/edital modes to a specific one (a graph may have several).
export function buildRoadmap(
  grafoId: string,
  modo: RoadmapMode,
  opts?: { regenerate?: boolean; provaId?: string; editalId?: string },
): Promise<RoadmapBuildResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/roadmap`, {
    method: "POST",
    body: JSON.stringify({
      modo,
      regenerate: opts?.regenerate,
      provaId: opts?.provaId,
      editalId: opts?.editalId,
    }),
  });
}

// Total de tokens de IA gastos na sessão (todas as features), medido no adapter.
export function getTokenUsage(): Promise<TokenUsageView> {
  return apiFetch("/token-usage");
}

export interface BaralhoItem { id: string; titulo: string; flashcardCount: number; }
export interface PopulateFromBaralhoResult { assuntos: number; topicos: number; conceitos: number; baralhoNome: string; }
export function listBaralhosInGrafo(grafoId: string): Promise<BaralhoItem[]> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/baralhos`, { method: "POST" });
}
export function populateGraphFromBaralho(grafoId: string, baralhoId: string): Promise<PopulateFromBaralhoResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/baralhos/${baralhoId}/populate`, { method: "POST" });
}

// ── Classificação do acervo em lotes (Fase 6) ──────────────────────────────
export interface ClassificationPlanConcept { nome: string; topico: string; descricao: string; flashcardIds: string[]; }
export interface ClassificationPlanPayload {
  assuntos: Array<{ nome: string; descricao: string }>;
  topicos: Array<{ nome: string; assunto: string; descricao: string }>;
  conceitos: ClassificationPlanConcept[];
}
export interface DeckClassificationChunkResult {
  baralhoNome: string;
  totalCards: number;
  classifiedCards: number;
  chunkCards: Array<{ id: string; pergunta: string; resposta: string }>;
  plan: ClassificationPlanPayload | null; // null = baralho todo classificado
}
export interface ApplyClassificationResult { assuntos: number; topicos: number; conceitos: number; linkedCards: number; }
export function planDeckClassificationChunk(
  grafoId: string,
  baralhoId: string,
  chunkSize?: number,
): Promise<DeckClassificationChunkResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/baralhos/${baralhoId}/classification/plan`, {
    method: "POST",
    body: JSON.stringify({ chunkSize }),
  });
}
export function applyDeckClassificationChunk(
  grafoId: string,
  baralhoId: string,
  plan: ClassificationPlanPayload,
): Promise<ApplyClassificationResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/baralhos/${baralhoId}/classification/apply`, {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
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
// Detecção por similaridade de embeddings — escala grafos grandes que o detector
// por LLM trunca. threshold (0..1) opcional ajusta o rigor.
export function detectDuplicatesBySimilarity(
  grafoId: string,
  threshold?: number,
): Promise<{ groups: DuplicateGroup[] }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/detect-duplicates-similar`, {
    method: "POST",
    body: JSON.stringify({ threshold }),
  });
}

// ── Melhorar flashcard com IA ────────────────────────────────────────────────
export type ImproveFlashcardOperation = "format" | "markdown" | "content";
export function improveFlashcard(input: {
  pergunta: string;
  resposta: string;
  operations: ImproveFlashcardOperation[];
}): Promise<{ pergunta: string; resposta: string }> {
  return apiFetch(`/ai/graph/flashcards/improve`, { method: "POST", body: JSON.stringify(input) });
}

export interface QuestaoAlternativa {
  letra: string;
  texto: string;
}
export function improveQuestao(input: {
  tipo: string;
  enunciado: string;
  alternativas: QuestaoAlternativa[];
  gabarito: string;
  explicacao: string;
  operations: ImproveFlashcardOperation[];
}): Promise<{ enunciado: string; alternativas: QuestaoAlternativa[]; explicacao: string }> {
  return apiFetch(`/ai/graph/questions/improve`, { method: "POST", body: JSON.stringify(input) });
}

export function improveNota(input: {
  titulo: string;
  conteudo: string;
  operations: ImproveFlashcardOperation[];
}): Promise<{ titulo: string; conteudo: string }> {
  return apiFetch(`/ai/graph/notas/improve`, { method: "POST", body: JSON.stringify(input) });
}

export interface BatchQuestaoInput {
  numero: number;
  tipo: string;
  enunciado: string;
  alternativas: QuestaoAlternativa[];
  gabarito: string;
  explicacao: string;
}
export function improveProvaQuestoes(
  questoes: BatchQuestaoInput[],
  operations: ImproveFlashcardOperation[],
): Promise<Array<{ numero: number; enunciado: string; alternativas: QuestaoAlternativa[]; explicacao: string }>> {
  return apiFetch(`/ai/graph/questions/improve-batch`, {
    method: "POST",
    body: JSON.stringify({ questoes, operations }),
  });
}

// ── Expansão de nó ─────────────────────────────────────────────────────────
export function expandNode(
  grafoId: string,
  nodeId: string,
): Promise<{ topicos: number; conceitos: number; notas: number; flashcards: number }> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/nodes/${nodeId}/expand`, { method: "POST" });
}

export interface ClassifyFlashcardResult { conceitos: number; linked: number; }
export function classifyFlashcard(grafoId: string, nodeId: string): Promise<ClassifyFlashcardResult> {
  return apiFetch(`/ai/graph/graphs/${grafoId}/nodes/${nodeId}/classify-flashcard`, { method: "POST" });
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
