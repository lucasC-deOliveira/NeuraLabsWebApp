"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { graphHttp } from "../../infra/http";

// Busca com filtros poderosos sobre o layout do grafo:
//   • texto (escopo: tudo / título / conteúdo)
//   • tipo de nó (multi-seleção; vazio = todos)
//   • domínio / maestria (faixa 0–100%)
//   • prioridade de revisão (faixa 0–10)
//   • grau de conexões (todos / isolados / folhas / hubs)
//
// IMPORTANTE (performance/memória): o CONTEÚDO dos nós NÃO é carregado no
// payload do grafo. A busca por conteúdo roda no servidor sob demanda
// (searchGraphNodeContent) e devolve apenas os ids que casam — assim o grafo
// continua leve mesmo com notas/textos grandes (e, no futuro, vídeo/imagens).
// Os demais filtros (título, tipo, domínio, prioridade, grau) são locais.

export type DegreeFilter = "all" | "isolated" | "leaf" | "hub";
// onde a busca por texto procura: tudo, só no título/rótulo, ou só no conteúdo
export type TextScope = "all" | "title" | "content";

export const HUB_MIN_DEGREE = 4;
export const PRIORITY_MAX = 10;
const RESULT_LIMIT = 50;
const CONTENT_DEBOUNCE_MS = 250;

type SearchNode = {
  id: string;
  label?: string;
  group?: string;
  pergunta?: string;
  dominio?: number;
  prioridadeRevisao?: number;
};

type SearchEdge = { source: string; target: string };

export type GraphSearchFilters = {
  query: string;
  textScope: TextScope;
  types: Set<string>;
  domainMin: number;
  domainMax: number;
  priorityMin: number;
  priorityMax: number;
  degree: DegreeFilter;
};

// nº de relações por nó
export function computeDegreeMap(edges: SearchEdge[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of edges) {
    m.set(e.source, (m.get(e.source) ?? 0) + 1);
    m.set(e.target, (m.get(e.target) ?? 0) + 1);
  }
  return m;
}

// quantos critérios estão efetivamente ativos (texto + 4 filtros)
export function countActiveFilters(f: GraphSearchFilters): number {
  return (
    (f.query.trim() ? 1 : 0) +
    (f.types.size > 0 ? 1 : 0) +
    (f.domainMin > 0 || f.domainMax < 100 ? 1 : 0) +
    (f.priorityMin > 0 || f.priorityMax < PRIORITY_MAX ? 1 : 0) +
    (f.degree !== "all" ? 1 : 0)
  );
}

// a busca por texto precisa do servidor (conteúdo) quando há termo e o escopo
// inclui o conteúdo
export function needsContentSearch(f: GraphSearchFilters): boolean {
  return f.query.trim() !== "" && (f.textScope === "content" || f.textScope === "all");
}

// filtragem pura — devolve os nós que passam em TODOS os critérios ativos.
// `contentMatchIds` é o conjunto de ids que casaram por conteúdo (vindo do
// servidor); null = ainda não carregado / não necessário.
export function filterGraphNodes<T extends SearchNode>(
  nodes: T[],
  edges: SearchEdge[],
  f: GraphSearchFilters,
  contentMatchIds: Set<string> | null = null,
): T[] {
  const q = f.query.trim().toLowerCase();
  const scope = f.textScope ?? "all";
  const degreeMap = f.degree !== "all" ? computeDegreeMap(edges) : null;

  return nodes.filter((n) => {
    if (q) {
      // título = rótulo + pergunta do flashcard; conteúdo = resultado do servidor
      const inTitle =
        (n.label ?? "").toLowerCase().includes(q) ||
        (n.pergunta ?? "").toLowerCase().includes(q);
      const inContent = contentMatchIds ? contentMatchIds.has(n.id) : false;
      const ok =
        scope === "title" ? inTitle : scope === "content" ? inContent : inTitle || inContent;
      if (!ok) return false;
    }
    if (f.types.size > 0 && !f.types.has(n.group ?? "")) return false;

    const domPct = Math.round((n.dominio ?? 0) * 100);
    if (domPct < f.domainMin || domPct > f.domainMax) return false;

    const prio = n.prioridadeRevisao ?? 0;
    if (prio < f.priorityMin || prio > f.priorityMax) return false;

    if (degreeMap) {
      const d = degreeMap.get(n.id) ?? 0;
      if (f.degree === "isolated" && d !== 0) return false;
      if (f.degree === "leaf" && d !== 1) return false;
      if (f.degree === "hub" && d < HUB_MIN_DEGREE) return false;
    }
    return true;
  });
}

export function useGraphSearch<T extends SearchNode>(
  layout: T[],
  edges: SearchEdge[],
  grafoId?: string,
) {
  const [query, setQuery] = useState("");
  const [textScope, setTextScope] = useState<TextScope>("all");
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [domainMin, setDomainMin] = useState(0);
  const [domainMax, setDomainMax] = useState(100);
  const [priorityMin, setPriorityMin] = useState(0);
  const [priorityMax, setPriorityMax] = useState(PRIORITY_MAX);
  const [degree, setDegree] = useState<DegreeFilter>("all");

  // resultado da busca por conteúdo no servidor (ids) + estado de carregamento
  const [contentMatchIds, setContentMatchIds] = useState<Set<string> | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const filters: GraphSearchFilters = {
    query, textScope, types, domainMin, domainMax, priorityMin, priorityMax, degree,
  };

  const wantsContent = needsContentSearch(filters);
  const trimmedQuery = query.trim();

  // carrega o conteúdo SÓ quando o usuário usa a busca por conteúdo (debounced)
  useEffect(() => {
    if (!wantsContent || !grafoId) {
      setContentMatchIds(null);
      setContentLoading(false);
      return;
    }
    let cancelled = false;
    setContentLoading(true);
    const handle = setTimeout(() => {
      graphHttp.searchGraphNodeContent(grafoId, trimmedQuery)
        .then((ids) => {
          if (!cancelled) setContentMatchIds(new Set(ids));
        })
        .catch(() => {
          if (!cancelled) setContentMatchIds(new Set());
        })
        .finally(() => {
          if (!cancelled) setContentLoading(false);
        });
    }, CONTENT_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [wantsContent, grafoId, trimmedQuery]);

  const activeCount = countActiveFilters(filters);
  const active = activeCount > 0;

  const matched = useMemo(
    () => (active ? filterGraphNodes(layout, edges, filters, contentMatchIds) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      active, layout, edges, query, textScope, types,
      domainMin, domainMax, priorityMin, priorityMax, degree, contentMatchIds,
    ],
  );

  const matchedIds = useMemo(
    () => (active ? new Set(matched.map((n) => n.id)) : null),
    [active, matched],
  );

  const toggleType = useCallback((t: string) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setTextScope("all");
    setTypes(new Set());
    setDomainMin(0);
    setDomainMax(100);
    setPriorityMin(0);
    setPriorityMax(PRIORITY_MAX);
    setDegree("all");
  }, []);

  // mostra "carregando" enquanto o conteúdo do servidor não chegou
  const loadingContent = wantsContent && contentLoading;

  return {
    filters,
    actions: {
      setQuery,
      setTextScope,
      toggleType,
      setDomainMin,
      setDomainMax,
      setPriorityMin,
      setPriorityMax,
      setDegree,
      clear,
    },
    matchedIds,
    results: active ? matched.slice(0, RESULT_LIMIT) : [],
    matchedCount: matched.length,
    activeCount,
    active,
    loadingContent,
  };
}

export type GraphSearch = ReturnType<typeof useGraphSearch>;
