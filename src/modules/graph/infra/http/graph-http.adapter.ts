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
} from "@/lib/graph-api";
import { generateLearningPath } from "@/lib/ai-api";
import type {
  GraphDataPort,
  NodePosition,
} from "../../application/ports/graph-data.port";
import type { GraphAiPort, LearningStep } from "../../application/ports/graph-ai.port";
import type {
  GraphNodeType,
  GraphEdgeType,
  EdgeView,
  GrafoInfoDetail,
  GraphVisualState,
} from "../../domain/types/graph.types";

export class HttpGraphAdapter implements GraphDataPort, GraphAiPort {
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
}
