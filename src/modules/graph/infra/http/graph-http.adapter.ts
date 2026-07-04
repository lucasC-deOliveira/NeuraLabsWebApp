// HTTP adapter (infra) — the ONLY place inside src/modules/graph that touches the
// @/lib/*-api HTTP edge. Implements the application ports by delegating to the
// existing clients (Anti-Corruption Layer), so presentation/application never
// import @/lib/*-api directly.
import {
  getGraphNodes,
  getGraphEdges,
  getGrafoInfo,
  loadGraphVisualState,
  saveGraphPositions,
  searchGraphNodeContent,
  getAvailableItems,
  listUserFlashcards,
  getNodeDetails,
  updateGraphNode,
  addNodeToGraph,
  createBaralhoNode,
  addProvaToGraph,
  deleteGraphNode,
  removeNodeFromGraph,
  getDeckForStudy,
  createSubgrafo,
  extractNodesToSubgrafo,
  importGraph,
  createEdge,
  updateEdge,
  deleteEdge,
  listUserGraphs,
  createGrafo,
  deleteGrafo,
} from "@/lib/graph-api";
import {
  generateLearningPath,
  suggestNotaRelations,
  autoLinkGraph,
  applyAutoLink,
  detectDuplicates,
  mergeDuplicates,
  assessCompleteness,
  fillKnowledgeGaps,
  detectMissingPrerequisites,
  addMissingPrerequisite,
  generateNodeInsights,
  addInsightsToGraph,
  generateCommunitySummary,
  chatWithGraph,
  suggestGapFill,
  planGraphFromText,
  buildGraphFromPlan,
  listBaralhosInGrafo,
  populateGraphFromBaralho,
  expandNode,
} from "@/lib/ai-api";
import { parseProvaUpload, createProvaFromParsed, getProva } from "@/lib/provas-api";
import {
  startSingleCardStudy,
  startDeckStudy,
  submitCardReview,
  finalizeStudySession,
} from "@/lib/study-api";
import type {
  GraphDataPort,
  NodePosition,
  AvailableItems,
  UserFlashcard,
} from "../../application/ports/graph-data.port";
import type {
  GraphAiPort,
  LearningStep,
  NotaRelationSuggestion,
  AutoLinkSuggestion,
  AppliedEdge,
  DuplicateGroup,
  CompletenessAssessment,
  GapItem,
  GeneratedContentCount,
  MissingPrereq,
  NodeInsightsResult,
  InsightToAdd,
  ChatHistoryItem,
  ChatReferencedNode,
  NodeInsight,
  GenerateGraphResult,
  BaralhoItem,
  PopulateFromBaralhoResult,
} from "../../application/ports/graph-ai.port";
import type { GraphNodesPort, NodeDetails } from "../../application/ports/graph-nodes.port";
import type { GraphDeckPort, DeckForStudy } from "../../application/ports/graph-deck.port";
import type {
  GraphSubgrafoPort,
  CreateSubgrafoInput,
  ExtractSubgrafoInput,
} from "../../application/ports/graph-subgrafo.port";
import type { GraphImportPort } from "../../application/ports/graph-import.port";
import type { ImportGraphPayload } from "../../domain/types/graph-import.types";
import type {
  StudyPort,
  SingleCardStudy,
  DeckStudySession,
  CardReviewInput,
} from "../../application/ports/study.port";
import type { GraphEdgesPort, CreateEdgeData } from "../../application/ports/graph-edges.port";
import type { GraphProvaPort, ProvaParseResult, ParsedQuestao, ProvaDetailView } from "../../application/ports/graph-prova.port";
import type { GraphListPort } from "../../application/ports/graph-list.port";
import type {
  GraphNodeType,
  GraphEdgeType,
  EdgeView,
  GrafoInfo,
  GrafoInfoDetail,
  GraphVisualState,
} from "../../domain/types/graph.types";

export class HttpGraphAdapter
  implements
    GraphDataPort,
    GraphAiPort,
    GraphNodesPort,
    GraphDeckPort,
    StudyPort,
    GraphSubgrafoPort,
    GraphImportPort,
    GraphEdgesPort,
    GraphProvaPort,
    GraphListPort
{
  expandNode(grafoId: string, nodeId: string): Promise<{ topicos: number; conceitos: number; notas: number; flashcards: number }> {
    return expandNode(grafoId, nodeId);
  }

  listUserGraphs(): Promise<GrafoInfo[]> {
    return listUserGraphs();
  }

  createGrafo(nome: string, descricao?: string): Promise<{ id: string }> {
    return createGrafo(nome, descricao);
  }

  deleteGrafo(grafoId: string, options?: { keepTypes?: string[] }): Promise<void> {
    return deleteGrafo(grafoId, options);
  }

  getGraphNodes(grafoId?: string): Promise<{ nodes: GraphNodeType[]; edges: GraphEdgeType[] }> {
    return getGraphNodes(grafoId);
  }

  getGraphEdges(grafoId: string): Promise<EdgeView[]> {
    return getGraphEdges(grafoId);
  }

  getGrafoInfo(grafoId: string): Promise<GrafoInfoDetail | null> {
    return getGrafoInfo(grafoId);
  }

  loadGraphVisualState(grafoId: string): Promise<GraphVisualState | null> {
    return loadGraphVisualState(grafoId);
  }

  saveGraphPositions(grafoId: string, positions: Record<string, NodePosition>): Promise<void> {
    return saveGraphPositions(grafoId, positions);
  }

  searchGraphNodeContent(grafoId: string, query: string): Promise<string[]> {
    return searchGraphNodeContent(grafoId, query);
  }

  getAvailableItems(grafoId: string): Promise<AvailableItems> {
    return getAvailableItems(grafoId);
  }

  listUserFlashcards(): Promise<UserFlashcard[]> {
    return listUserFlashcards();
  }

  generateLearningPath(grafoId: string): Promise<{ steps: LearningStep[] }> {
    return generateLearningPath(grafoId);
  }

  getNodeDetails(group: string, nodeId: string): Promise<NodeDetails | null> {
    return getNodeDetails(group, nodeId);
  }

  updateGraphNode(
    group: string,
    nodeId: string,
    data: Record<string, unknown>,
    grafoId: string,
  ): Promise<{ success: boolean }> {
    return updateGraphNode(group, nodeId, data, grafoId);
  }

  addNodeToGraph(
    grafoId: string,
    tipoNode: string,
    data: Record<string, unknown>,
  ): Promise<{ success: boolean; nodeId: string }> {
    return addNodeToGraph(grafoId, tipoNode, data);
  }

  createBaralhoNode(
    grafoId: string,
    titulo: string,
    flashcardIds: string[],
  ): Promise<{ success: boolean; nodeId: string }> {
    return createBaralhoNode(grafoId, titulo, flashcardIds);
  }

  addProvaToGraph(grafoId: string, provaId: string): Promise<{ success: boolean; nodeId: string }> {
    return addProvaToGraph(grafoId, provaId);
  }

  getDeckForStudy(baralhoId: string): Promise<DeckForStudy | null> {
    return getDeckForStudy(baralhoId);
  }

  startSingleCardStudy(flashcardId: string): Promise<SingleCardStudy | null> {
    return startSingleCardStudy(flashcardId);
  }

  startDeckStudy(baralhoId: string): Promise<DeckStudySession | null> {
    return startDeckStudy(baralhoId);
  }

  submitCardReview(input: CardReviewInput): Promise<{ success: boolean }> {
    return submitCardReview(input);
  }

  finalizeStudySession(sessionId: string): Promise<{ success: boolean }> {
    return finalizeStudySession(sessionId);
  }

  createSubgrafo(parentGrafoId: string, input: CreateSubgrafoInput): Promise<{ grafoId: string; grafoRefNodeId: string }> {
    return createSubgrafo(parentGrafoId, input);
  }

  extractNodesToSubgrafo(
    parentGrafoId: string,
    input: ExtractSubgrafoInput,
  ): Promise<{ grafoId: string; grafoRefNodeId: string; movedCount: number; rewiredEdgeCount: number }> {
    return extractNodesToSubgrafo(parentGrafoId, input);
  }

  importGraph(grafoId: string, payload: ImportGraphPayload): Promise<{ nodes: number; edges: number; reused: number }> {
    return importGraph(grafoId, payload);
  }

  deleteGraphNode(
    graphNodeId: string,
    grafoId?: string,
    options?: { deleteConnected?: boolean },
  ): Promise<{ success: boolean; deletedType?: string }> {
    return deleteGraphNode(graphNodeId, grafoId, options);
  }

  removeNodeFromGraph(graphNodeId: string, grafoId: string): Promise<{ success: boolean }> {
    return removeNodeFromGraph(graphNodeId, grafoId);
  }

  suggestNotaRelations(grafoId: string, titulo: string, conteudo: string): Promise<NotaRelationSuggestion[]> {
    return suggestNotaRelations(grafoId, titulo, conteudo);
  }

  autoLinkGraph(grafoId: string): Promise<{ suggestions: AutoLinkSuggestion[] }> {
    return autoLinkGraph(grafoId);
  }

  applyAutoLink(grafoId: string, edges: AppliedEdge[]): Promise<{ added: number }> {
    return applyAutoLink(grafoId, edges);
  }

  detectDuplicates(grafoId: string): Promise<{ groups: DuplicateGroup[] }> {
    return detectDuplicates(grafoId);
  }

  mergeDuplicates(grafoId: string, keepId: string, deleteIds: string[]): Promise<{ merged: number; edgesMoved: number }> {
    return mergeDuplicates(grafoId, keepId, deleteIds);
  }

  assessCompleteness(grafoId: string): Promise<{ assessments: CompletenessAssessment[] }> {
    return assessCompleteness(grafoId);
  }

  fillKnowledgeGaps(grafoId: string, gaps: GapItem[]): Promise<GeneratedContentCount> {
    return fillKnowledgeGaps(grafoId, gaps);
  }

  detectMissingPrerequisites(grafoId: string): Promise<{ prerequisites: MissingPrereq[] }> {
    return detectMissingPrerequisites(grafoId);
  }

  addMissingPrerequisite(grafoId: string, nome: string, tipo: string, connectToIds: string[]): Promise<{ nodeId: string }> {
    return addMissingPrerequisite(grafoId, nome, tipo, connectToIds);
  }

  generateNodeInsights(grafoId: string, nodeId: string): Promise<NodeInsightsResult> {
    return generateNodeInsights(grafoId, nodeId);
  }

  addInsightsToGraph(grafoId: string, sourceNodeId: string, insights: InsightToAdd[]): Promise<{ added: number }> {
    return addInsightsToGraph(grafoId, sourceNodeId, insights);
  }

  generateCommunitySummary(grafoId: string, nodeIds: string[]): Promise<{ titulo: string; resumo: string }> {
    return generateCommunitySummary(grafoId, nodeIds);
  }

  chatWithGraph(
    grafoId: string,
    question: string,
    history: ChatHistoryItem[],
  ): Promise<{ answer: string; referencedNodes: ChatReferencedNode[] }> {
    return chatWithGraph(grafoId, question, history);
  }

  suggestGapFill(
    grafoId: string,
    body: { labelsA: string[]; labelsB: string[]; bridgeA: string; bridgeB: string },
  ): Promise<{ insights: NodeInsight[] }> {
    return suggestGapFill(grafoId, body);
  }

  planGraphFromText(grafoId: string, rawText: string): Promise<{ plan: unknown }> {
    return planGraphFromText(grafoId, rawText);
  }

  buildGraphFromPlan(
    grafoId: string,
    rawText: string,
    plan: unknown,
    saveBruto: boolean,
  ): Promise<GenerateGraphResult> {
    return buildGraphFromPlan(grafoId, rawText, plan, saveBruto);
  }

  listBaralhosInGrafo(grafoId: string): Promise<BaralhoItem[]> {
    return listBaralhosInGrafo(grafoId);
  }

  populateGraphFromBaralho(grafoId: string, baralhoId: string): Promise<PopulateFromBaralhoResult> {
    return populateGraphFromBaralho(grafoId, baralhoId);
  }

  parseProvaUpload(provaFile: File, gabaritoFile?: File | null): Promise<ProvaParseResult> {
    return parseProvaUpload(provaFile, gabaritoFile);
  }

  getProva(provaId: string): Promise<ProvaDetailView | null> {
    return getProva(provaId);
  }

  createProvaFromParsed(input: { titulo: string; questoes: ParsedQuestao[] }): Promise<{ provaId: string }> {
    return createProvaFromParsed(input);
  }

  createEdge(grafoId: string, data: CreateEdgeData): Promise<{ success: boolean; edgeId: string }> {
    return createEdge(grafoId, data);
  }

  updateEdge(
    edgeId: string,
    grafoId: string,
    data: { tipoRelacao?: string; peso?: number },
  ): Promise<{ success: boolean }> {
    return updateEdge(edgeId, grafoId, data);
  }

  deleteEdge(edgeId: string, grafoId: string): Promise<{ success: boolean }> {
    return deleteEdge(edgeId, grafoId);
  }
}
