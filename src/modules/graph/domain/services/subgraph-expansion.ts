// Expandir/retrair um subgrafo DENTRO da vista atual, sem sair da página. A tile
// (nó GRAFO_REF) é uma referência a outro grafo; expandi-la puxa os nós e arestas
// daquele grafo para junto dela, e retrair os remove. Puro: recebe a vista e a
// vista do subgrafo, devolve a vista nova. Quem busca o subgrafo é a página.
import type { GraphNodeType, GraphEdgeType } from "../types/graph.types";

export interface GraphView {
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
}

// Raio do anel onde os nós do subgrafo são espalhados ao redor da tile — evita que
// empilhem no mesmo ponto antes de a física assentar.
const RING_RADIUS = 320;

// Expandir mostra a ESTRUTURA do subgrafo, não o acervo. Um subgrafo pode ter
// milhares de flashcards/questões (NODEJS tem 3.345); injetá-los inline congelaria
// o render e afogaria o mapa conceitual. Os tipos pesados ficam de fora — o
// conteúdo completo continua a um clique, em "Abrir subgrafo". Sem esta linha, os
// dois primeiros teimam em aparecer.
const HEAVY_TYPES = new Set(["FLASHCARD", "QUESTION"]);

const isStructural = (n: GraphNodeType): boolean => !HEAVY_TYPES.has(n.type);

const edgeKey = (e: GraphEdgeType): string => `${e.source}→${e.target}→${e.type}`;

/** Já há nós puxados por esta tile na vista? */
export function isSubgraphExpanded(nodes: GraphNodeType[], refId: string): boolean {
  return nodes.some((n) => n.expandedFrom === refId);
}

/**
 * Puxa a vista de um subgrafo para junto da sua tile. Nó que já está na vista (o
 * mesmo nó do sistema pode estar nos dois grafos) NÃO é duplicado — nem removido no
 * retrair, porque não carrega a marca. As arestas do subgrafo entre nós presentes
 * entram; a tile ganha uma aresta para cada ASSUNTO-raiz trazido, ancorando o
 * cluster nela.
 * @example expandSubgraphIntoView(view, tile, subgrafoView)
 */
export function expandSubgraphIntoView(
  view: GraphView,
  ref: GraphNodeType,
  child: GraphView,
): GraphView {
  const present = new Set(view.nodes.map((n) => n.id));
  const novos = child.nodes.filter((n) => n.id !== ref.id && !present.has(n.id) && isStructural(n));
  const injetados = novos.map((n, i) => positionAround(n, ref, i, novos.length));
  const depois = new Set([...present, ...injetados.map((n) => n.id)]);
  return {
    nodes: [...view.nodes, ...injetados],
    edges: [...view.edges, ...childEdgesToKeep(child, ref, depois, view.edges), ...anchors(injetados, ref)],
  };
}

// Arestas do subgrafo entre nós presentes, que a vista ainda não tem.
function childEdgesToKeep(
  child: GraphView,
  ref: GraphNodeType,
  present: Set<string>,
  viewEdges: GraphEdgeType[],
): GraphEdgeType[] {
  const vistas = new Set(viewEdges.map(edgeKey));
  return child.edges
    .filter((e) => present.has(e.source) && present.has(e.target) && !vistas.has(edgeKey(e)))
    .map((e) => ({ ...e, expandedFrom: ref.id }));
}

// A tile ganha uma aresta para cada ASSUNTO-raiz trazido, ancorando o cluster nela.
function anchors(injetados: GraphNodeType[], ref: GraphNodeType): GraphEdgeType[] {
  return injetados
    .filter((n) => n.type === "ASSUNTO")
    .map((n) => ({ source: ref.id, target: n.id, type: "CONTEM", peso: 1, expandedFrom: ref.id }));
}

/** Remove tudo que a tile trouxe. A tile e os nós próprios da vista permanecem. */
export function retractSubgraphFromView(view: GraphView, refId: string): GraphView {
  return {
    nodes: view.nodes.filter((n) => n.expandedFrom !== refId),
    edges: view.edges.filter((e) => e.expandedFrom !== refId),
  };
}

function positionAround(n: GraphNodeType, ref: GraphNodeType, i: number, total: number): GraphNodeType {
  const angle = (2 * Math.PI * i) / Math.max(1, total);
  const cx = ref.posicaoX ?? 0;
  const cy = ref.posicaoY ?? 0;
  return {
    ...n,
    expandedFrom: ref.id,
    posicaoX: cx + RING_RADIUS * Math.cos(angle),
    posicaoY: cy + RING_RADIUS * Math.sin(angle),
  };
}
