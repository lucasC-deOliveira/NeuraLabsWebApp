import { useCallback, useEffect, useState } from "react";
import { isDesktop } from "@/lib/vault-bridge";
import { flashcardsHttp } from "../../infra/http";
import { flattenConceptOptions } from "../../domain/services/concept-options";
import {
  loadCachedFlashcards,
  saveCachedFlashcards,
  type FlashcardsSnapshot,
} from "../services/flashcards-cache";

const EMPTY: FlashcardsSnapshot = { cards: [], filterData: [], concepts: [] };

async function fetchSnapshot(): Promise<FlashcardsSnapshot> {
  const [cards, filterData, subjects] = await Promise.all([
    flashcardsHttp.getFlashcards(),
    flashcardsHttp.getFilterData(),
    flashcardsHttp.getConceptHierarchy(),
  ]);
  return { cards, filterData, concepts: flattenConceptOptions(subjects) };
}

export interface FlashcardsData {
  snapshot: FlashcardsSnapshot;
  loading: boolean;
  reload: () => Promise<void>;
}

/**
 * Carrega a listagem de flashcards em stale-while-revalidate: abre com o cache local
 * (sem spinner) e revalida no backend em segundo plano, regravando o cache.
 * @example const { snapshot, loading, reload } = useFlashcardsData();
 */
export function useFlashcardsData(): FlashcardsData {
  const [cached] = useState(() => isDesktop() ? null : loadCachedFlashcards());
  const [snapshot, setSnapshot] = useState<FlashcardsSnapshot>(cached ?? EMPTY);
  const [loading, setLoading] = useState(cached === null);

  const apply = useCallback((d: FlashcardsSnapshot): void => {
    setSnapshot(d);
    setLoading(false);
    if (!isDesktop()) saveCachedFlashcards(d);
  }, []);

  // Dispara o fetch de forma síncrona; o estado assenta no callback da promise para
  // não haver setState no corpo do efeito (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    fetchSnapshot()
      .then((d): void => { if (!cancelled) apply(d); })
      .catch((): void => { if (!cancelled) setLoading(false); });
    return (): void => { cancelled = true; };
  }, [apply]);

  const reload = useCallback(async (): Promise<void> => { apply(await fetchSnapshot()); }, [apply]);

  return { snapshot, loading, reload };
}
