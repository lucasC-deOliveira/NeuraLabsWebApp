import { analyticsHttp } from "../../infra/http";
import type { DeckAnalytics } from "../../domain/deck-analytics.types";
import { useCachedResource } from "@/modules/cache/presentation/useCachedResource";

function toDeckOptions(data: DeckAnalytics): { id: string; label: string }[] {
  return data.decks.map((deck) => ({ id: deck.baralhoId, label: deck.titulo }));
}

// Opções de baralho para o dropdown do filtro (reusa o analytics de baralhos).
// Mesma chave do useDeckAnalytics(90) → compartilha o cache, sem fetch duplicado.
export function useDeckOptions(): { id: string; label: string }[] {
  const { data } = useCachedResource(
    { key: "analytics.decks.90", version: 1, tags: ["analytics"] },
    () => analyticsHttp.getDeckAnalytics(90),
    "",
  );
  return data ? toDeckOptions(data) : [];
}
