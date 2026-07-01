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
  getNodeDetails,
  updateGraphNode,
  addNodeToGraph,
  createBaralhoNode,
  addProvaToGraph,
  createEdge,
  updateEdge,
  deleteEdge,
} from "@/lib/graph-api";
import { generateLearningPath, suggestNotaRelations } from "@/lib/ai-api";
import type {
  GraphDataPort,
  NodePosition,
} from "../../application/ports/graph-data.port";
import type { GraphAiPort, LearningStep, NotaRelationSuggestion } from "../../application/ports/graph-ai.port";
import type { GraphNodesPort, NodeDetails } from "../../application/ports/graph-nodes.port";
import type { GraphEdgesPort, CreateEdgeData } from "../../application/ports/graph-edges.port";
import type {
  GraphNodeType,
  GraphEdgeType,
  EdgeView,
  GrafoInfoDetail,
  GraphVisualState,
} from "../../domain/types/graph.types";

export class HttpGraphAdapter implements GraphDataPort, GraphAiPort, GraphNodesPort, GraphEdgesPort {
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

  suggestNotaRelations(grafoId: string, titulo: string, conteudo: string): Promise<NotaRelationSuggestion[]> {
    return suggestNotaRelations(grafoId, titulo, conteudo);
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
