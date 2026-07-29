import { getItemComposition } from "@/lib/graph-api";
import type { CompositionGraph, CompositionTipo } from "./composition.types";
import { useCachedResource } from "@/modules/cache/presentation/useCachedResource";

interface CompositionState {
  graph: CompositionGraph | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Carrega a composição de um item por (tipo, id); não busca quando id é null.
// SWR sobre o CacheStore: reabrir o mesmo mini-grafo é instantâneo; reload()
// re-busca após completar com IA.
export function useComposition(tipo: CompositionTipo, id: string | null): CompositionState {
  const { data: graph, loading, error, reload } = useCachedResource<CompositionGraph>(
    id ? { key: `composition.${tipo}.${id}`, version: 1 } : null,
    () => getItemComposition(tipo, id as string),
    "Erro ao montar o mini-grafo.",
  );
  return { graph, loading, error, reload };
}
