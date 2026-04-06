// Re-export from domain layer for backward compatibility
export {
  buildKnowledgeGraph,
  getCriticalNodes,
} from "@/modules/graph/domain/services/knowledge-graph-builder";
export type {
  GraphNode,
  GraphEdge,
  TipoRelacao,
} from "@/modules/graph/domain/services/knowledge-graph-builder";
