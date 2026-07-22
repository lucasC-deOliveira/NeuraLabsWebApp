import { useEffect, useState } from "react";
import { analyticsHttp } from "../infra/http";
import type { FlashcardAnalytics } from "../domain/analytics.types";

interface FlashcardAnalyticsState {
  data: FlashcardAnalytics | null;
  loading: boolean;
  error: string | null; // mensagem para exibir; null quando ok
  reload: () => void;
}

// Carrega os analytics de flashcards do backend. Expõe a mensagem de erro real e
// um reload() para o botão "tentar novamente".
export function useFlashcardAnalytics(): FlashcardAnalyticsState {
  const [data, setData] = useState<FlashcardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    analyticsHttp
      .getFlashcardAnalytics()
      .then((d) => { if (active) { setData(d); setError(null); } })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Erro ao carregar os analytics."); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, [nonce]);

  // Chamado pelo botão "tentar novamente" (fora de render/effect).
  const reload = (): void => { setLoading(true); setError(null); setData(null); setNonce((n) => n + 1); };

  return { data, loading, error, reload };
}
