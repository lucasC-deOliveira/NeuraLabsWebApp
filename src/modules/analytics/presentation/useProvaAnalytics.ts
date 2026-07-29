import { analyticsHttp } from "../infra/http";
import type { ProvaAnalytics } from "../domain/prova-analytics.types";
import { useCachedResource, type CachedResource } from "@/modules/cache/presentation/useCachedResource";

export type ProvaAnalyticsState = CachedResource<ProvaAnalytics>;

// Carrega o analytics de questões/provas (janela `days` + prova). SWR sobre o CacheStore.
export function useProvaAnalytics(days: number, provaId?: string): ProvaAnalyticsState {
  return useCachedResource(
    { key: `analytics.provas.${days}.${provaId ?? ""}`, version: 1, tags: ["analytics"] },
    () => analyticsHttp.getProvaAnalytics(days, provaId),
    "Erro ao carregar os analytics.",
  );
}
