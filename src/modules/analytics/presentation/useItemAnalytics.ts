import { analyticsHttp } from "../infra/http";
import type { FlashcardItemAnalytics } from "../domain/flashcard-item.types";
import type { QuestaoItemAnalytics } from "../domain/questao-item.types";
import { useCachedResource } from "@/modules/cache/presentation/useCachedResource";

interface ItemState<T> {
  data: T | null;
  loading: boolean;
  error: string | null; // mensagem para exibir; null quando ok
}

// Carrega o analytics de um item por id; não busca quando id é null (modal fechado).
// SWR sobre o CacheStore: reabrir o mesmo item é instantâneo. keyPrefix separa
// flashcard de questão para os ids não colidirem no cache.
function useItemAnalytics<T>(
  id: string | null,
  keyPrefix: string,
  load: (id: string) => Promise<T>,
): ItemState<T> {
  const { data, loading, error } = useCachedResource<T>(
    id ? { key: `${keyPrefix}.${id}`, version: 1, tags: ["analytics"] } : null,
    () => load(id as string),
    "Erro ao carregar os analytics.",
  );
  return { data, loading, error };
}

export function useFlashcardItemAnalytics(id: string | null): ItemState<FlashcardItemAnalytics> {
  return useItemAnalytics(id, "analytics.item.flashcard", (x) => analyticsHttp.getFlashcardItemAnalytics(x));
}

export function useQuestaoItemAnalytics(id: string | null): ItemState<QuestaoItemAnalytics> {
  return useItemAnalytics(id, "analytics.item.questao", (x) => analyticsHttp.getQuestaoItemAnalytics(x));
}
