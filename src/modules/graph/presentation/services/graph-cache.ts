// Cache local (localStorage) do último grafo carregado, por id — para reabrir um
// grafo instantaneamente (stale-while-revalidate): mostra o cache na hora e revalida
// no backend em segundo plano. Grafos muito grandes não são cacheados (estouram a
// quota do localStorage). Falhas de leitura/escrita são silenciosas.
import type { GraphNodeType, GraphEdgeType } from "../../domain/types/graph.types";

const KEY_PREFIX = "neuralabs.graph-cache.";
// Acima disto o JSON fica grande demais para o localStorage — não cacheia.
const MAX_CACHEABLE_NODES = 4000;

export interface CachedGraph {
  nodes: GraphNodeType[];
  edges: GraphEdgeType[];
  zoom: number;
  pan: { x: number; y: number };
  grafoNome: string;
  savedAt: number;
}

export function loadCachedGraph(graphId: string): CachedGraph | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + graphId);
    return raw ? (JSON.parse(raw) as CachedGraph) : null;
  } catch {
    return null;
  }
}

export function saveCachedGraph(graphId: string, data: CachedGraph): void {
  if (data.nodes.length > MAX_CACHEABLE_NODES) return;
  try {
    localStorage.setItem(KEY_PREFIX + graphId, JSON.stringify(data));
  } catch {
    // quota estourada / modo privado — o cache é apenas uma otimização.
  }
}
