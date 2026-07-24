import { useEffect, useState } from "react";
import { analyticsHttp } from "../infra/http";
import type { FeynmanAnalytics } from "../domain/feynman-analytics.types";

interface FeynmanAnalyticsState {
  data: FeynmanAnalytics | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Carrega os analytics da Técnica Feynman do backend (janela `days`).
export function useFeynmanAnalytics(days: number): FeynmanAnalyticsState {
  const [data, setData] = useState<FeynmanAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    analyticsHttp
      .getFeynmanAnalytics(days)
      .then((d) => { if (active) { setData(d); setError(null); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Erro ao carregar os analytics."); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [days, nonce]);

  const reload = (): void => { setLoading(true); setError(null); setData(null); setNonce((n) => n + 1); };
  return { data, loading, error, reload };
}
