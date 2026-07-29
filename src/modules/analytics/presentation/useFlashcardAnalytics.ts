import { analyticsHttp } from "../infra/http";
import type { FlashcardAnalytics } from "../domain/analytics.types";
import { useCachedResource, type CachedResource } from "@/modules/cache/presentation/useCachedResource";

export type FlashcardAnalyticsState = CachedResource<FlashcardAnalytics>;

// Carrega os analytics de flashcards do backend (janela `days` + filtros). SWR
// sobre o CacheStore: reabre instantâneo do cache e revalida em background.
export function useFlashcardAnalytics(
  days: number,
  baralhoId?: string,
  assuntoId?: string,
): FlashcardAnalyticsState {
  const key = `analytics.flashcards.${days}.${baralhoId ?? ""}.${assuntoId ?? ""}`;
  return useCachedResource(
    { key, version: 1, tags: ["analytics"] },
    () => analyticsHttp.getFlashcardAnalytics(days, baralhoId, assuntoId),
    "Erro ao carregar os analytics.",
  );
}
