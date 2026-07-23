import { useEffect, useState } from "react";
import { analyticsHttp } from "../infra/http";
import type { FlashcardItemAnalytics } from "../domain/flashcard-item.types";
import type { QuestaoItemAnalytics } from "../domain/questao-item.types";

interface ItemState<T> {
  data: T | null;
  loading: boolean;
  error: string | null; // mensagem para exibir; null quando ok
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Erro ao carregar os analytics.";
}

// Dispara a busca e devolve o cleanup que a invalida (evita corrida ao trocar id).
function startLoad<T>(
  id: string,
  load: (id: string) => Promise<T>,
  onData: (data: T) => void,
  onError: (message: string) => void,
  onSettled: () => void,
): () => void {
  let active = true;
  load(id)
    .then((d) => { if (active) onData(d); })
    .catch((e) => { if (active) onError(errorMessage(e)); })
    .finally(() => { if (active) onSettled(); });
  return (): void => { active = false; };
}

// Carrega o analytics de um item por id; não busca quando id é null (modal fechado).
// O reset acontece em render (react-hooks v7 proíbe setState síncrono no efeito).
export function useItemAnalytics<T>(id: string | null, load: (id: string) => Promise<T>): ItemState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [prevId, setPrevId] = useState<string | null>(null);
  if (id !== prevId) {
    setPrevId(id);
    setData(null);
    setError(null);
    setLoadingId(id);
  }
  useEffect(() => {
    if (!id) return;
    return startLoad(id, load, (d) => { setData(d); setError(null); }, setError, () => setLoadingId(null));
  }, [id, load]);
  return { data, loading: id !== null && loadingId === id, error };
}

// Fetchers estáveis (identidade fixa) para as deps do efeito.
const loadFlashcardItem = (id: string): Promise<FlashcardItemAnalytics> =>
  analyticsHttp.getFlashcardItemAnalytics(id);
const loadQuestaoItem = (id: string): Promise<QuestaoItemAnalytics> =>
  analyticsHttp.getQuestaoItemAnalytics(id);

export function useFlashcardItemAnalytics(id: string | null): ItemState<FlashcardItemAnalytics> {
  return useItemAnalytics(id, loadFlashcardItem);
}

export function useQuestaoItemAnalytics(id: string | null): ItemState<QuestaoItemAnalytics> {
  return useItemAnalytics(id, loadQuestaoItem);
}
