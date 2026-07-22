import { useEffect, useState } from "react";
import { analyticsHttp } from "../infra/http";
import type { FlashcardAnalytics } from "../domain/analytics.types";

interface FlashcardAnalyticsState {
  data: FlashcardAnalytics | null;
  loading: boolean;
  error: boolean;
}

// Carrega os analytics de flashcards do backend (uma vez, ao montar a aba).
export function useFlashcardAnalytics(): FlashcardAnalyticsState {
  const [data, setData] = useState<FlashcardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    analyticsHttp
      .getFlashcardAnalytics()
      .then((d) => { if (active) setData(d); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return (): void => { active = false; };
  }, []);

  return { data, loading, error };
}
