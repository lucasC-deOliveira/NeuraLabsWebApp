import { analyticsHttp } from "../infra/http";
import type { FeynmanAnalytics } from "../domain/feynman-analytics.types";
import { useCachedResource, type CachedResource } from "@/modules/cache/presentation/useCachedResource";

export type FeynmanAnalyticsState = CachedResource<FeynmanAnalytics>;

// Carrega os analytics da Técnica Feynman (janela `days`). SWR sobre o CacheStore.
export function useFeynmanAnalytics(days: number): FeynmanAnalyticsState {
  return useCachedResource(
    { key: `analytics.feynman.${days}`, version: 1, tags: ["analytics"] },
    () => analyticsHttp.getFeynmanAnalytics(days),
    "Erro ao carregar os analytics.",
  );
}
