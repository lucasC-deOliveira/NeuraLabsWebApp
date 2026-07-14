// Estado + carregamento da listagem de grafos (busca/filtro/ordenação/paginação
// server-side). Qualquer mudança de filtro volta para a página 1; só setPage navega.
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { graphHttp } from "../../infra/http";
import type { GraphListParams, GraphListResult } from "../../domain/types/graph.types";

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

// Dispara o fetch (liga o loading, escreve o resultado ao voltar) e ignora a
// resposta se o efeito já foi limpo — evita corrida entre trocas rápidas de filtro.
// Vive fora do hook para que o corpo do useEffect não faça setState direto.
function fetchList(
  params: GraphListParams,
  setResult: Dispatch<SetStateAction<GraphListResult>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
): () => void {
  let alive = true;
  setLoading(true);
  graphHttp
    .listUserGraphs(params)
    .then((r) => { if (alive) { setResult(r); setLoading(false); } })
    .catch(() => { if (alive) setLoading(false); });
  return () => { alive = false; };
}

export function useGraphList(): GraphListApi {
  const [params, setParams] = useState<GraphListParams>({ page: 1, pageSize: PAGE_SIZE });
  const [result, setResult] = useState<GraphListResult>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => fetchList(params, setResult, setLoading), [params, reloadKey]);

  const setFilter = useCallback(
    (patch: Partial<GraphListParams>) => setParams((p) => ({ ...p, ...patch, page: 1 })),
    [],
  );
  const setPage = useCallback((page: number) => setParams((p) => ({ ...p, page })), []);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { params, result, loading, setFilter, setPage, reload };
}
