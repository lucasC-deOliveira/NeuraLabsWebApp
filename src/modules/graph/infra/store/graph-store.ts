import type { GraphNode, GraphEdge } from "@/lib/graph";

// ---------------------------------------------------------------------------
// GraphStore — abstração da persistência do GRAFO (estrutura: nós + arestas).
//
// Duas implementações, escolhidas pela config global de armazenamento:
//   - PrismaGraphStore   → banco de dados (comportamento atual)
//   - MarkdownGraphStore  → sistema de arquivos, vault Markdown no formato PARA
//
// Importante (modelo híbrido): SRS/estudo, login e ConfigAI permanecem no banco,
// indexados pelo id do nó. Só a ESTRUTURA do grafo é abstraída aqui.
//
// Esta interface cresce por fase. Hoje cobre a LEITURA do grafo; as operações
// de escrita (criar/editar/excluir nós e arestas, posições) entram junto com o
// backend Markdown nas próximas fases.
// ---------------------------------------------------------------------------

export interface GraphStore {
  /** Monta o grafo completo (nós + arestas) de um usuário, opcionalmente de um grafo. */
  loadGraph(userId: string, grafoId?: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
}
