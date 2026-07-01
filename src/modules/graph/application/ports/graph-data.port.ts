// Port (application boundary) for graph read/write over the HTTP edge.
// The presentation layer depends on this interface; only infra/ implements it
// (Anti-Corruption Layer over @/lib/graph-api). No React, no @/lib here.
import type {
  GraphNodeType,
  GraphEdgeType,
  EdgeView,
  GrafoInfoDetail,
  GraphVisualState,
} from "../../domain/types/graph.types";

export interface NodePosition {
  x: number;
  y: number;
}

export interface AvailableItem {
  id: string;
  label: string;
  fullText: string;
  tipo: string;
  hierarquia: string;
  conceitoId?: string | null;
}

export interface AvailableItems {
  flashcards: AvailableItem[];
  notas: AvailableItem[];
  questoes?: AvailableItem[];
  provas?: AvailableItem[];
}

export interface UserFlashcard {
  id: string;
  pergunta: string;
  conceito: string | null;
}

export interface GraphDataPort {
  getGraphNodes(grafoId?: string): Promise<{ nodes: GraphNodeType[]; edges: GraphEdgeType[] }>;
  getGraphEdges(grafoId: string): Promise<EdgeView[]>;
  getGrafoInfo(grafoId: string): Promise<GrafoInfoDetail | null>;
  loadGraphVisualState(grafoId: string): Promise<GraphVisualState | null>;
  saveGraphPositions(grafoId: string, positions: Record<string, NodePosition>): Promise<void>;
  searchGraphNodeContent(grafoId: string, query: string): Promise<string[]>;
  getAvailableItems(grafoId: string): Promise<AvailableItems>;
  listUserFlashcards(): Promise<UserFlashcard[]>;
}
