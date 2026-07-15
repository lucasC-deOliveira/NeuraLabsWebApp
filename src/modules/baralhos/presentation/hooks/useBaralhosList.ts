import { useCallback, useEffect, useState } from "react";
import { baralhosHttp } from "../../infra/http";
import type { BaralhoItem } from "../../domain/baralho.types";
import { loadCachedBaralhos, saveCachedBaralhos } from "../services/baralhos-cache";

export interface BaralhosList {
  baralhos: BaralhoItem[];
  loading: boolean;
  reload: () => Promise<void>;
}

// Dispara o fetch de forma síncrona; o estado assenta no callback da promise para
// não haver setState no corpo do efeito (react-hooks/set-state-in-effect).
function revalidate(
  apply: (items: BaralhoItem[]) => void,
  stopLoading: () => void,
): () => void {
  let cancelled = false;
  baralhosHttp
    .listBaralhos()
    .then((items): void => { if (!cancelled) apply(items); })
    .catch((): void => { if (!cancelled) stopLoading(); });
  return (): void => { cancelled = true; };
}

/**
 * Carrega os baralhos em stale-while-revalidate: abre com o cache local (sem
 * spinner) e revalida no backend em segundo plano, regravando o cache.
 * @example const { baralhos, loading, reload } = useBaralhosList();
 */
export function useBaralhosList(): BaralhosList {
  const [cached] = useState(loadCachedBaralhos);
  const [baralhos, setBaralhos] = useState<BaralhoItem[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  const apply = useCallback((items: BaralhoItem[]): void => {
    setBaralhos(items);
    setLoading(false);
    saveCachedBaralhos(items);
  }, []);

  const stopLoading = useCallback((): void => setLoading(false), []);
  useEffect(() => revalidate(apply, stopLoading), [apply, stopLoading]);

  const reload = useCallback(async (): Promise<void> => {
    apply(await baralhosHttp.listBaralhos());
  }, [apply]);

  return { baralhos, loading, reload };
}
