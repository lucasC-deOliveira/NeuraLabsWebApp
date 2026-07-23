import { useMemo, useState } from "react";

interface Paginated<T> {
  page: T[]; // fatia visível da página atual
  pageIndex: number; // 0-based, já clampado ao total
  pageCount: number;
  next: () => void;
  prev: () => void;
}

// Pagina uma lista em memória. Auto-cura o índice quando a lista encolhe (ex.:
// troca de filtro) via clamp ao pageCount, sem setState em efeito.
export function usePagination<T>(items: T[], pageSize: number): Paginated<T> {
  const [rawIndex, setRawIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const pageIndex = Math.min(rawIndex, pageCount - 1);
  const start = pageIndex * pageSize;
  const page = useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize]);
  const next = (): void => setRawIndex(Math.min(pageIndex + 1, pageCount - 1));
  const prev = (): void => setRawIndex(Math.max(pageIndex - 1, 0));
  return { page, pageIndex, pageCount, next, prev };
}
