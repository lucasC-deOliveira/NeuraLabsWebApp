import { useEffect, useState } from "react";
import { analyticsHttp } from "../../infra/http";

function toAssuntoOptions(rows: { id: string; nome: string }[]): { id: string; label: string }[] {
  return rows.map((row) => ({ id: row.id, label: row.nome }));
}

// Opções de assunto para o dropdown do filtro (reusa a hierarquia de conteúdo).
export function useAssuntoOptions(): { id: string; label: string }[] {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    let active = true;
    analyticsHttp
      .getAssuntoOptions()
      .then((rows) => { if (active) setOptions(toAssuntoOptions(rows)); })
      .catch(() => undefined);
    return (): void => { active = false; };
  }, []);
  return options;
}
