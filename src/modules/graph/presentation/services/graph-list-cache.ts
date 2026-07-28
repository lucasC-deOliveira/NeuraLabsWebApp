// Cache local da listagem de grafos, por combinação de filtros/página — para
// reabrir "Meus Grafos" instantaneamente (stale-while-revalidate). Sobre o
// CacheStore unificado; criar/renomear/apagar grafo invalida a tag inteira.
import type { GraphListParams, GraphListResult } from "../../domain/types/graph.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";

// Tag da listagem de grafos: uma mutação limpa todas as combinações de filtro.
export const GRAPH_LIST_TAG = "graph-list";

// Chave estável derivada dos parâmetros de consulta: a mesma query lê o mesmo cache.
// assuntoIds é ordenado para que a ordem de seleção não gere chaves distintas.
function cacheKey(params: GraphListParams): string {
  return JSON.stringify({
    q: params.q ?? "",
    tipo: params.tipo ?? "todos",
    sort: params.sort ?? "recentes",
    createdFrom: params.createdFrom ?? "",
    createdTo: params.createdTo ?? "",
    assuntoIds: [...(params.assuntoIds ?? [])].sort(),
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 0,
  });
}

function slotOf(params: GraphListParams): CacheSlot<GraphListResult> {
  return cacheStore.slot({ key: `graph-list.${cacheKey(params)}`, version: 1, tags: [GRAPH_LIST_TAG] });
}

export function loadCachedGraphList(params: GraphListParams): GraphListResult | null {
  return slotOf(params).read();
}

export function saveCachedGraphList(params: GraphListParams, result: GraphListResult): void {
  slotOf(params).write(result);
}

/** Invalida todas as combinações de filtro — chamar após criar/renomear/apagar grafo. */
export function invalidateGraphList(): void {
  cacheStore.invalidateTag(GRAPH_LIST_TAG);
}
