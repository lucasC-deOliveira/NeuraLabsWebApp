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
  createEdge,
  updateEdge,
  deleteEdge,
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
} from "@/lib/ai-api";
import { parseProvaUpload, createProvaFromParsed } from "@/lib/provas-api";
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
} from "../../application/ports/graph-ai.port";
import type { GraphNodesPort, NodeDetails } from "../../application/ports/graph-nodes.port";
import type { GraphEdgesPort, CreateEdgeData } from "../../application/ports/graph-edges.port";
import type { GraphProvaPort, ProvaParseResult, ParsedQuestao } from "../../application/ports/graph-prova.port";
import type {
  GraphNodeType,
  GraphEdgeType,
  EdgeView,
  GrafoInfoDetail,
  GraphVisualState,
} from "../../domain/types/graph.types";

export class HttpGraphAdapter
  implements GraphDataPort, GraphAiPort, GraphNodesPort, GraphEdgesPort, GraphProvaPort
{
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

  deleteGraphNode(
    graphNodeId: string,
    grafoId?: string,
    options?: { deleteConnected?: boolean },
  ): Promise<{ success: boolean; deletedType?: string }> {
    return deleteGraphNode(graphNodeId, grafoId, options);
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

  parseProvaUpload(provaFile: File, gabaritoFile: File): Promise<ProvaParseResult> {
    return parseProvaUpload(provaFile, gabaritoFile);
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
