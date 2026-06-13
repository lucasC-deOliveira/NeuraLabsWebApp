import type { GraphNode, GraphEdge, TipoRelacao } from "@/lib/graph";
import type { TipoNode } from "./vault-format";

export interface EdgeView {
  id: string;
  source: string;
  target: string;
  tipoRelacao: TipoRelacao;
  peso: number;
  sourceLabel: string;
  targetLabel: string;
}

export interface CreateEdgeInput {
  sourceNodeId: string;
  targetNodeId: string;
  tipoRelacao: TipoRelacao;
  peso?: number;
}

export interface UpdateNodeInput {
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  conteudo?: string;
  titulo?: string;
  tipoNota?: string;
  fonte?: string | null;
  subtipo?: string;
  texto?: string;
}

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

  /** Arestas do grafo com rótulos das pontas (para o gerenciador de relações). */
  getEdges(userId: string, grafoId: string): Promise<EdgeView[]>;

  /** Cria uma aresta (valida par de tipos e duplicidade). Devolve o id da aresta. */
  createEdge(userId: string, grafoId: string, input: CreateEdgeInput): Promise<{ edgeId: string }>;

  /** Atualiza tipo/peso de uma aresta existente. */
  updateEdge(
    userId: string,
    grafoId: string,
    edgeId: string,
    data: { tipoRelacao?: TipoRelacao; peso?: number },
  ): Promise<void>;

  /** Remove uma aresta. */
  deleteEdge(userId: string, grafoId: string, edgeId: string): Promise<void>;

  /** Exclui um nó (entidade + vínculos). Devolve o tipo do nó removido. */
  deleteNode(userId: string, refId: string, grafoId?: string): Promise<{ deletedType: string }>;

  /** Atualiza os campos da entidade de um nó. */
  updateNode(
    userId: string,
    tipoNode: TipoNode,
    refId: string,
    data: UpdateNodeInput,
    grafoId?: string,
  ): Promise<void>;

  /** Campos editáveis/exibíveis da entidade de um nó. */
  getNodeDetails(
    userId: string,
    tipoNode: TipoNode,
    refId: string,
  ): Promise<Record<string, string | null> | null>;

  /** Salva as posições (x,y) dos nós. Chaves podem vir como "tipo:refId" ou refId. */
  savePositions(
    userId: string,
    grafoId: string,
    positions: Record<string, { x: number; y: number }>,
  ): Promise<void>;

  /** Posições salvas dos nós (por referenciaId). */
  getPositions(userId: string, grafoId: string): Promise<Record<string, { x: number; y: number }>>;
}
