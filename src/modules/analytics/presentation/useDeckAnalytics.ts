import { useEffect, useState } from "react";
import { analyticsHttp } from "../infra/http";
import type { DeckAnalytics } from "../domain/deck-analytics.types";

interface DeckAnalyticsState {
  data: DeckAnalytics | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Carrega o analytics por baralho (janela `days` afeta a acurácia). Refaz ao mudar.
export function useDeckAnalytics(days: number): DeckAnalyticsState {
  const [data, setData] = useState<DeckAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    analyticsHttp
      .getDeckAnalytics(days)
      .then((d) => { if (active) { setData(d); setError(null); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Erro ao carregar os analytics."); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [days, nonce]);

  const reload = (): void => { setLoading(true); setError(null); setData(null); setNonce((n) => n + 1); };
  return { data, loading, error, reload };
}
