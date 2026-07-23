import { useEffect, useState } from "react";
import { getItemComposition } from "@/lib/graph-api";
import type { CompositionGraph, CompositionTipo } from "./composition.types";

interface CompositionState {
  graph: CompositionGraph | null;
  loading: boolean;
  error: string | null;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : "Erro ao montar o mini-grafo.";
}

// Dispara a busca e devolve o cleanup que a invalida (corrida ao trocar item).
function run(
  tipo: CompositionTipo,
  id: string,
  onData: (g: CompositionGraph) => void,
  onError: (m: string) => void,
  onSettled: () => void,
): () => void {
  let active = true;
  getItemComposition(tipo, id)
    .then((g) => { if (active) onData(g); })
    .catch((e) => { if (active) onError(message(e)); })
    .finally(() => { if (active) onSettled(); });
  return (): void => { active = false; };
}

// Carrega a composição de um item por (tipo, id); não busca quando id é null.
// Reset em render (react-hooks v7 proíbe setState síncrono no efeito).
export function useComposition(tipo: CompositionTipo, id: string | null): CompositionState {
  const [graph, setGraph] = useState<CompositionGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const key = id ? `${tipo}:${id}` : null;
  if (key !== prevKey) {
    setPrevKey(key);
    setGraph(null);
    setError(null);
    setLoadingKey(key);
  }
  useEffect(() => {
    if (!id) return;
    return run(tipo, id, (g) => { setGraph(g); setError(null); }, setError, () => setLoadingKey(null));
  }, [tipo, id]);
  return { graph, loading: key !== null && loadingKey === key, error };
}
