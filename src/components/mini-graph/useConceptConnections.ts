import { useEffect, useState } from "react";
import type { ConceptConnection } from "./mini-graph.types";

interface ConnectionsState {
  connections: ConceptConnection[] | null;
  loading: boolean;
  error: string | null;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : "Erro ao carregar as conexões.";
}

// Dispara a busca e devolve o cleanup que a invalida (evita corrida ao trocar id).
function run(
  id: string,
  load: (id: string) => Promise<ConceptConnection[]>,
  onData: (rows: ConceptConnection[]) => void,
  onError: (m: string) => void,
  onSettled: () => void,
): () => void {
  let active = true;
  load(id)
    .then((rows) => { if (active) onData(rows); })
    .catch((e) => { if (active) onError(message(e)); })
    .finally(() => { if (active) onSettled(); });
  return (): void => { active = false; };
}

// Carrega as conexões de conceito de um item por id (baralho/prova, que agregam do
// detalhe). Não busca quando id é null; reset em render (react-hooks v7).
export function useConceptConnections(id: string | null, load: (id: string) => Promise<ConceptConnection[]>): ConnectionsState {
  const [connections, setConnections] = useState<ConceptConnection[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  if (id !== prevId) {
    setPrevId(id);
    setConnections(null);
    setError(null);
    setLoadingId(id);
  }
  useEffect(() => {
    if (!id) return;
    return run(id, load, (rows) => { setConnections(rows); setError(null); }, setError, () => setLoadingId(null));
  }, [id, load]);
  return { connections, loading: id !== null && loadingId === id, error };
}
