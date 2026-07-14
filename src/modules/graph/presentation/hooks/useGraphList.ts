// Estado + carregamento da listagem de grafos (busca/filtro/ordenação/paginação
// server-side). Qualquer mudança de filtro volta para a página 1; só setPage navega.
// Stale-while-revalidate: semeia do cache local no render (abertura instantânea) e
// revalida no backend em background, reescrevendo o cache.
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { graphHttp } from "../../infra/http";
import type { GraphListParams, GraphListResult } from "../../domain/types/graph.types";
import { loadCachedGraphList, saveCachedGraphList } from "../services/graph-list-cache";

const PAGE_SIZE = 12;
const EMPTY: GraphListResult = { items: [], total: 0, page: 1, pageSize: PAGE_SIZE };

export interface GraphListApi {
  params: GraphListParams;
  result: GraphListResult;
  loading: boolean;
  setFilter: (patch: Partial<GraphListParams>) => void;
  setPage: (page: number) => void;
  reload: () => void;
}

// Revalida no backend sem religar o loading (o cache já preencheu a tela). Grava o
// resultado + cache ao voltar e ignora respostas obsoletas de trocas rápidas de query.
function revalidate(
  params: GraphListParams,
  setResult: Dispatch<SetStateAction<GraphListResult>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
): () => void {
  let alive = true;
  graphHttp
    .listUserGraphs(params)
    .then((r) => { if (alive) { setResult(r); saveCachedGraphList(params, r); setLoading(false); } })
    .catch(() => { if (alive) setLoading(false); });
  return () => { alive = false; };
}

// Cache presente → mostra na hora sem spinner; ausente → limpa e liga o spinner.
function seedFromCache(
  params: GraphListParams,
  setResult: Dispatch<SetStateAction<GraphListResult>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
): void {
  const cached = loadCachedGraphList(params);
  if (cached) { setResult(cached); setLoading(false); }
  else { setResult(EMPTY); setLoading(true); }
}

export function useGraphList(): GraphListApi {
  const [params, setParams] = useState<GraphListParams>({ page: 1, pageSize: PAGE_SIZE });
  const [result, setResult] = useState<GraphListResult>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [seededKey, setSeededKey] = useState<string | null>(null);

  // Troca de query: semeia do cache no render (sem set-state-in-effect).
  const key = JSON.stringify(params);
  if (key !== seededKey) { setSeededKey(key); seedFromCache(params, setResult, setLoading); }

  useEffect(() => revalidate(params, setResult, setLoading), [params, reloadKey]);

  const setFilter = useCallback(
    (patch: Partial<GraphListParams>) => setParams((p) => ({ ...p, ...patch, page: 1 })),
    [],
  );
  const setPage = useCallback((page: number) => setParams((p) => ({ ...p, page })), []);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { params, result, loading, setFilter, setPage, reload };
}
