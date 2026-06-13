import type { GraphNode, GraphEdge } from "@/lib/graph";
import type { TipoNode } from "./vault-format";

// Payload de criação de um nó (entidade + nó no grafo). Os campos relevantes
// variam por tipo; a validação é feita na action antes de chamar o store.
export interface CreateNodeInput {
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
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
  // pai opcional (banco) — no modo Markdown a hierarquia é por arestas
  assuntoId?: string | null;
  topicoId?: string | null;
}

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

  /** Cria uma nova entidade + nó no grafo. Devolve o id da entidade (= id do nó). */
  createNode(
    userId: string,
    grafoId: string,
    tipoNode: TipoNode,
    input: CreateNodeInput,
  ): Promise<{ nodeId: string }>;
}
