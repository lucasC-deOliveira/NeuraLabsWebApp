import { buildKnowledgeGraph, type GraphNode, type GraphEdge } from "@/lib/graph";
import type { GraphStore } from "./graph-store";

// Backend de banco de dados — comportamento atual do app. A leitura delega ao
// builder existente, que consulta o Prisma.
export class PrismaGraphStore implements GraphStore {
  async loadGraph(
    userId: string,
    grafoId?: string,
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    return buildKnowledgeGraph(userId, grafoId);
  }
}
