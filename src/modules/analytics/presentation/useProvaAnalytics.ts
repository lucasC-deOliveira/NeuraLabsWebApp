import { useEffect, useState } from "react";
import { analyticsHttp } from "../infra/http";
import type { ProvaAnalytics } from "../domain/prova-analytics.types";

interface ProvaAnalyticsState {
  data: ProvaAnalytics | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Carrega o analytics de questões/provas (janela `days`). Refaz ao mudar days.
export function useProvaAnalytics(days: number, provaId?: string): ProvaAnalyticsState {
  const [data, setData] = useState<ProvaAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    analyticsHttp
      .getProvaAnalytics(days, provaId)
      .then((d) => { if (active) { setData(d); setError(null); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Erro ao carregar os analytics."); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [days, provaId, nonce]);

  const reload = (): void => { setLoading(true); setError(null); setData(null); setNonce((n) => n + 1); };
  return { data, loading, error, reload };
}
