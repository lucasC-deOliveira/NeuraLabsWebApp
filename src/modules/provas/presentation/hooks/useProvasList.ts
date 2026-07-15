import { useCallback, useEffect, useState } from "react";
import { provasHttp } from "../../infra/http";
import type { ProvaListItem } from "../../domain/prova.types";
import { loadCachedProvas, saveCachedProvas } from "../services/provas-cache";

export interface ProvasList {
  provas: ProvaListItem[];
  loading: boolean;
  // Tira a prova da lista sem ir ao backend de novo (ela acabou de ser excluída).
  // Regrava o cache junto: sem isso a prova excluída ressuscitaria ao reabrir.
  remove: (id: string) => void;
}

const semAProva = (provas: ProvaListItem[], id: string): ProvaListItem[] =>
  provas.filter((p) => p.id !== id);

// Dispara o fetch de forma síncrona; o estado assenta no callback da promise para
// não haver setState no corpo do efeito (react-hooks/set-state-in-effect).
function revalidate(
  apply: (items: ProvaListItem[]) => void,
  stopLoading: () => void,
): () => void {
  let cancelled = false;
  provasHttp
    .listProvas()
    .then((items): void => { if (!cancelled) apply(items); })
    .catch((): void => { if (!cancelled) stopLoading(); });
  return (): void => { cancelled = true; };
}

/**
 * Carrega as provas em stale-while-revalidate: abre com o cache local (sem spinner)
 * e revalida no backend em segundo plano, regravando o cache.
 * @example const { provas, loading, remove } = useProvasList();
 */
export function useProvasList(): ProvasList {
  const [cached] = useState(loadCachedProvas);
  const [provas, setProvas] = useState<ProvaListItem[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  const apply = useCallback((items: ProvaListItem[]): void => {
    setProvas(items);
    setLoading(false);
    saveCachedProvas(items);
  }, []);

  const stopLoading = useCallback((): void => setLoading(false), []);
  useEffect(() => revalidate(apply, stopLoading), [apply, stopLoading]);

  const remove = useCallback((id: string): void => {
    setProvas((prev) => {
      const restantes = semAProva(prev, id);
      saveCachedProvas(restantes);
      return restantes;
    });
  }, []);

  return { provas, loading, remove };
}
