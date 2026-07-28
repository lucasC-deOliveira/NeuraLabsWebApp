// Cache local do último grafo carregado, por id — para reabrir um grafo
// instantaneamente (stale-while-revalidate). Grafos muito grandes não são cacheados
// (estouram a quota do localStorage). Sobre o CacheStore unificado.
import type { GraphNodeType, GraphEdgeType } from "../../domain/types/graph.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";

// Tag da área "graph": mudanças na estrutura de um grafo invalidam seu cache.
export const GRAPH_TAG = "graph";
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

function slotOf(graphId: string): CacheSlot<CachedGraph> {
  return cacheStore.slot({ key: `graph.${graphId}`, version: 1, tags: [GRAPH_TAG] });
}

export function loadCachedGraph(graphId: string): CachedGraph | null {
  return slotOf(graphId).read();
}

export function saveCachedGraph(graphId: string, data: CachedGraph): void {
  if (data.nodes.length > MAX_CACHEABLE_NODES) return;
  slotOf(graphId).write(data);
}

/** Esquece um grafo específico — usar ao apagá-lo. */
export function forgetCachedGraph(graphId: string): void {
  slotOf(graphId).invalidate();
}
