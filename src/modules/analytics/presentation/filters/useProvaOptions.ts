import { useEffect, useState } from "react";
import { analyticsHttp } from "../../infra/http";
import type { ProvaAnalytics } from "../../domain/prova-analytics.types";

function toProvaOptions(data: ProvaAnalytics): { id: string; label: string }[] {
  return data.progress.map((p) => ({ id: p.provaId, label: p.titulo }));
}

// Opções de prova para o dropdown (só provas com tentativa — as que dá para filtrar).
export function useProvaOptions(): { id: string; label: string }[] {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    let active = true;
    analyticsHttp
      .getProvaAnalytics(36_500)
      .then((data) => { if (active) setOptions(toProvaOptions(data)); })
      .catch(() => undefined);
    return (): void => { active = false; };
  }, []);
  return options;
}
