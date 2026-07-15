import { useCallback, useEffect, useState } from "react";
import { baralhosHttp } from "../../infra/http";
import type { BaralhoDetail } from "../../domain/baralho.types";
import { loadCachedBaralho, saveCachedBaralho } from "../services/baralho-detail-cache";

export interface BaralhoDetailState {
  baralho: BaralhoDetail | null;
  loading: boolean;
  reload: () => Promise<void>;
}

// Dispara o fetch de forma síncrona; o estado assenta no callback da promise para
// não haver setState no corpo do efeito (react-hooks/set-state-in-effect).
function revalidate(
  baralhoId: string,
  apply: (detail: BaralhoDetail) => void,
  stopLoading: () => void,
): () => void {
  let cancelled = false;
  baralhosHttp
    .getBaralho(baralhoId)
    .then((detail): void => { if (!cancelled) apply(detail); })
    .catch((): void => { if (!cancelled) stopLoading(); });
  return (): void => { cancelled = true; };
}

/**
 * Carrega um baralho em stale-while-revalidate: abre com o cache local (sem
 * spinner) e revalida no backend em segundo plano, regravando o cache.
 * @example const { baralho, loading, reload } = useBaralhoDetail(id);
 */
export function useBaralhoDetail(baralhoId: string): BaralhoDetailState {
  const [cached] = useState(() => loadCachedBaralho(baralhoId));
  const [baralho, setBaralho] = useState<BaralhoDetail | null>(cached);
  const [loading, setLoading] = useState(cached === null);

  const apply = useCallback((detail: BaralhoDetail): void => {
    setBaralho(detail);
    setLoading(false);
    saveCachedBaralho(detail);
  }, []);

  const stopLoading = useCallback((): void => setLoading(false), []);
  useEffect(() => revalidate(baralhoId, apply, stopLoading), [baralhoId, apply, stopLoading]);

  const reload = useCallback(async (): Promise<void> => {
    apply(await baralhosHttp.getBaralho(baralhoId));
  }, [baralhoId, apply]);

  return { baralho, loading, reload };
}
