// Pure filter / sort pipeline for the deck list.
import type { BaralhoItem, BaralhoOrigin } from "../baralho.types";

export type BaralhoSort = "recentes" | "alfabetica" | "cartoes" | "estudar";

export interface BaralhoCriteria {
  search: string;
  // "" = todos os grafos (inclusive baralhos avulsos, sem origem).
  grafoId: string;
  pendingOnly: boolean;
  sortBy: BaralhoSort;
}

export const DEFAULT_BARALHO_CRITERIA: BaralhoCriteria = {
  search: "",
  grafoId: "",
  pendingOnly: false,
  sortBy: "recentes",
};

/** Total de cartões esperando estudo hoje (novos + aprender + revisar). */
export function pendingCount(baralho: BaralhoItem): number {
  return baralho.novos + baralho.aprender + baralho.revisar;
}

function matchesSearch(baralho: BaralhoItem, search: string): boolean {
  const term = search.trim().toLowerCase();
  return !term || baralho.titulo.toLowerCase().includes(term);
}

function matchesOrigin(baralho: BaralhoItem, grafoId: string): boolean {
  return !grafoId || baralho.origens.some((origem) => origem.grafoId === grafoId);
}

const COMPARATORS: Record<BaralhoSort, (a: BaralhoItem, b: BaralhoItem) => number> = {
  recentes: (a, b) => b.dataCriacao.getTime() - a.dataCriacao.getTime(),
  alfabetica: (a, b) => a.titulo.localeCompare(b.titulo),
  cartoes: (a, b) => b.totalCards - a.totalCards,
  estudar: (a, b) => pendingCount(b) - pendingCount(a),
};

/**
 * Aplica busca por título, grafo de origem e "só com pendências", depois ordena.
 * Não altera a lista recebida.
 * @example filterAndSortBaralhos(baralhos, { ...DEFAULT_BARALHO_CRITERIA, sortBy: "estudar" })
 */
export function filterAndSortBaralhos(
  baralhos: BaralhoItem[],
  criteria: BaralhoCriteria,
): BaralhoItem[] {
  const result = baralhos.filter(
    (baralho) =>
      matchesSearch(baralho, criteria.search) &&
      matchesOrigin(baralho, criteria.grafoId) &&
      (!criteria.pendingOnly || pendingCount(baralho) > 0),
  );
  return result.sort(COMPARATORS[criteria.sortBy]);
}

/** Filtros ativos (fora do padrão) para o badge. A busca não conta: já está visível. */
export function countActiveBaralhoFilters(criteria: BaralhoCriteria): number {
  return [
    criteria.grafoId || null,
    criteria.pendingOnly ? "1" : null,
    criteria.sortBy !== "recentes" ? "1" : null,
  ].filter(Boolean).length;
}

/** Grafos de origem distintos entre os baralhos, para alimentar o filtro. */
export function originOptions(baralhos: BaralhoItem[]): BaralhoOrigin[] {
  const byId = new Map<string, BaralhoOrigin>();
  for (const baralho of baralhos) {
    for (const origem of baralho.origens) byId.set(origem.grafoId, origem);
  }
  return [...byId.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}
