import { analyticsHttp } from "../../infra/http";
import { useCachedResource } from "@/modules/cache/presentation/useCachedResource";

function toAssuntoOptions(rows: { id: string; nome: string }[]): { id: string; label: string }[] {
  return rows.map((row) => ({ id: row.id, label: row.nome }));
}

// Opções de assunto para o dropdown do filtro (reusa a hierarquia de conteúdo).
// Cacheado (SWR): o dropdown abre instantâneo em revisitas.
export function useAssuntoOptions(): { id: string; label: string }[] {
  const { data } = useCachedResource(
    { key: "analytics.filters.assuntos", version: 1, tags: ["analytics"] },
    () => analyticsHttp.getAssuntoOptions(),
    "",
  );
  return data ? toAssuntoOptions(data) : [];
}
