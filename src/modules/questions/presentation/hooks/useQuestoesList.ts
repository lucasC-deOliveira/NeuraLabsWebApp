import { useCallback, useEffect, useState } from "react";
import { questionsHttp } from "../../infra/http";
import type { QuestaoListItem } from "../../domain/questao.types";
import { loadCachedQuestoes, saveCachedQuestoes } from "../services/questoes-cache";

export interface QuestoesList {
  questoes: QuestaoListItem[];
  loading: boolean;
  reload: () => Promise<void>;
}

// Dispara o fetch de forma síncrona; o estado assenta no callback da promise para
// não haver setState no corpo do efeito (react-hooks/set-state-in-effect).
function revalidate(
  apply: (items: QuestaoListItem[]) => void,
  stopLoading: () => void,
): () => void {
  let cancelled = false;
  questionsHttp
    .listQuestoes()
    .then((items): void => { if (!cancelled) apply(items); })
    .catch((): void => { if (!cancelled) stopLoading(); });
  return (): void => { cancelled = true; };
}

/**
 * Carrega as questões em stale-while-revalidate: abre com o cache local (sem
 * spinner) e revalida no backend em segundo plano, regravando o cache.
 * @example const { questoes, loading, reload } = useQuestoesList();
 */
export function useQuestoesList(): QuestoesList {
  const [cached] = useState(loadCachedQuestoes);
  const [questoes, setQuestoes] = useState<QuestaoListItem[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  const apply = useCallback((items: QuestaoListItem[]): void => {
    setQuestoes(items);
    setLoading(false);
    saveCachedQuestoes(items);
  }, []);

  const stopLoading = useCallback((): void => setLoading(false), []);
  useEffect(() => revalidate(apply, stopLoading), [apply, stopLoading]);

  const reload = useCallback(async (): Promise<void> => {
    apply(await questionsHttp.listQuestoes());
  }, [apply]);

  return { questoes, loading, reload };
}
