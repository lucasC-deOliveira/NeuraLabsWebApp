import { useCallback, useEffect, useMemo, useState } from "react";
import { cacheStore } from "../infra/local-cache-store";
import type { CacheSlot, SlotDef } from "../domain/cache-store";

export interface CachedResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface ResourceSetters<T> {
  setData: (value: T | null) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
}

// Semeia do cache: cache presente → mostra na hora sem spinner; ausente → limpa e
// liga o spinner (a menos que não haja chave, aí não há o que buscar).
function seedFromCache<T>(slot: CacheSlot<T> | null, key: string | null, set: ResourceSetters<T>): void {
  const cached = slot ? slot.read() : null;
  set.setData(cached);
  set.setLoading(key !== null && cached === null);
  set.setError(null);
}

// Revalida no backend sem religar o loading (o cache já preencheu a tela), grava o
// resultado + cache e ignora respostas obsoletas de trocas rápidas de chave.
function revalidate<T>(
  slot: CacheSlot<T> | null,
  fetcher: () => Promise<T>,
  set: ResourceSetters<T>,
  errorMessage: string,
): () => void {
  let alive = true;
  fetcher()
    .then((d) => { if (alive) { set.setData(d); set.setError(null); slot?.write(d); } })
    .catch((e) => { if (alive) set.setError(e instanceof Error ? e.message : errorMessage); })
    .finally(() => { if (alive) set.setLoading(false); });
  return (): void => { alive = false; };
}

/**
 * SWR sobre o CacheStore: semeia do cache no render (abertura instantânea, sem
 * set-state-in-effect) e revalida no backend em background, regravando o cache.
 * `def` null pula o fetch (ex.: sem id ainda). A chave do slot DEVE dobrar todos
 * os parâmetros do fetch, senão consultas diferentes colidem.
 * @example useCachedResource({ key: `analytics.flashcards.${days}`, version: 1 }, () => http.get(days), 'Erro')
 */
export function useCachedResource<T>(
  def: SlotDef<T> | null,
  fetcher: () => Promise<T>,
  errorMessage: string,
): CachedResource<T> {
  const key = def ? def.key : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slot = useMemo(() => (def ? cacheStore.slot(def) : null), [key, def?.version]);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  // Sentinel `undefined` != qualquer chave (incl. null): o seed roda no 1º render.
  const [seededKey, setSeededKey] = useState<string | null | undefined>(undefined);
  const set: ResourceSetters<T> = { setData, setLoading, setError };

  if (key !== seededKey) { setSeededKey(key); seedFromCache(slot, key, set); }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => (key ? revalidate(slot, fetcher, set, errorMessage) : undefined), [key, nonce]);

  const reload = useCallback((): void => { setLoading(true); setError(null); setNonce((n) => n + 1); }, []);
  return { data, loading, error, reload };
}
