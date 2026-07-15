import { useCallback, useEffect, useState } from "react";
import { provasHttp } from "../../infra/http";
import type { ProvaDetail } from "../../domain/prova.types";
import { loadCachedProva, saveCachedProva } from "../services/prova-detail-cache";

export interface ProvaDetailState {
  prova: ProvaDetail | null;
  loading: boolean;
  // A prova não veio do backend. Só é erro de verdade quando não há cache para
  // mostrar: com cache, a página segue aberta (offline não é prova inexistente).
  erro: boolean;
}

// Dispara o fetch de forma síncrona; o estado assenta no callback da promise para
// não haver setState no corpo do efeito (react-hooks/set-state-in-effect).
function revalidate(
  provaId: string,
  apply: (detail: ProvaDetail) => void,
  fail: () => void,
): () => void {
  let cancelled = false;
  provasHttp
    .getProva(provaId)
    .then((detail): void => { if (!cancelled) apply(detail); })
    .catch((): void => { if (!cancelled) fail(); });
  return (): void => { cancelled = true; };
}

/**
 * Carrega uma prova em stale-while-revalidate: abre com o cache local (sem spinner)
 * e revalida no backend em segundo plano, regravando o cache.
 * @example const { prova, loading, erro } = useProvaDetail(id);
 */
export function useProvaDetail(provaId: string): ProvaDetailState {
  const [cached] = useState(() => loadCachedProva(provaId));
  const [prova, setProva] = useState<ProvaDetail | null>(cached);
  const [loading, setLoading] = useState(cached === null);
  const [erro, setErro] = useState(false);

  const apply = useCallback((detail: ProvaDetail): void => {
    setProva(detail);
    setLoading(false);
    saveCachedProva(detail);
  }, []);

  const fail = useCallback((): void => {
    setLoading(false);
    setErro(true);
  }, []);

  useEffect(() => revalidate(provaId, apply, fail), [provaId, apply, fail]);

  return { prova, loading, erro };
}
