import { analyticsHttp } from "../infra/http";
import type { DeckAnalytics } from "../domain/deck-analytics.types";
import { useCachedResource, type CachedResource } from "@/modules/cache/presentation/useCachedResource";

export type DeckAnalyticsState = CachedResource<DeckAnalytics>;

// Carrega o analytics por baralho (janela `days`). SWR sobre o CacheStore.
export function useDeckAnalytics(days: number): DeckAnalyticsState {
  return useCachedResource(
    { key: `analytics.decks.${days}`, version: 1, tags: ["analytics"] },
    () => analyticsHttp.getDeckAnalytics(days),
    "Erro ao carregar os analytics.",
  );
}
