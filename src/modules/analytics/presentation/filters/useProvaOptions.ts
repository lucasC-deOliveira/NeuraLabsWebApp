import { analyticsHttp } from "../../infra/http";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";
import { useCachedResource } from "@/modules/cache/presentation/useCachedResource";

function toProvaOptions(data: ProvaAnalytics): { id: string; label: string }[] {
  return data.progress.map((p) => ({ id: p.provaId, label: p.titulo }));
}

// Opções de prova para o dropdown (só provas com tentativa — as que dá para filtrar).
// Mesma chave do useProvaAnalytics(36500) → compartilha o cache, sem fetch duplicado.
export function useProvaOptions(): { id: string; label: string }[] {
  const { data } = useCachedResource(
    { key: "analytics.provas.36500.", version: 1, tags: ["analytics"] },
    () => analyticsHttp.getProvaAnalytics(36_500),
    "",
  );
  return data ? toProvaOptions(data) : [];
}
