import { useEffect, useState } from "react";
import { analyticsHttp } from "../../infra/http";
import type { DeckAnalytics } from "../../domain/deck-analytics.types";

function toDeckOptions(data: DeckAnalytics): { id: string; label: string }[] {
  return data.decks.map((deck) => ({ id: deck.baralhoId, label: deck.titulo }));
}

// Opções de baralho para o dropdown do filtro (reusa o analytics de baralhos).
export function useDeckOptions(): { id: string; label: string }[] {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    let active = true;
    analyticsHttp
      .getDeckAnalytics(90)
      .then((data) => { if (active) setOptions(toDeckOptions(data)); })
      .catch(() => undefined);
    return (): void => { active = false; };
  }, []);
  return options;
}
