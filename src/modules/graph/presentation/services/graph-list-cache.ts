// Cache local (localStorage) da listagem de grafos, por combinação de filtros/página
// — para reabrir "Meus Grafos" instantaneamente (stale-while-revalidate): mostra a
// última resposta na hora e revalida no backend em segundo plano. Falhas de
// leitura/escrita são silenciosas (o cache é só uma otimização).
import type { GraphListParams, GraphListResult } from "../../domain/types/graph.types";

const KEY_PREFIX = "neuralabs.graph-list-cache.";

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

export function loadCachedGraphList(params: GraphListParams): GraphListResult | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + cacheKey(params));
    return raw ? (JSON.parse(raw) as GraphListResult) : null;
  } catch {
    return null;
  }
}

export function saveCachedGraphList(params: GraphListParams, result: GraphListResult): void {
  try {
    localStorage.setItem(KEY_PREFIX + cacheKey(params), JSON.stringify(result));
  } catch {
    // quota estourada / modo privado — o cache é apenas uma otimização.
  }
}
