// Filtro e ordenação da listagem de provas. Lógica pura.
// A linha da prova mostra título, descrição e o tamanho — é sobre isso que dá para
// perguntar aqui. As tags de conceito ficam na prova aberta: nesta lista toda prova
// cobre dezenas de conceitos, e um filtro por conceito casaria com quase todas.
import type { ProvaListItem } from "../prova.types";

export type ProvaSort = "recentes" | "alfabetica" | "questoes";

export interface ProvaCriteria {
  search: string;
  sortBy: ProvaSort;
}

export const DEFAULT_PROVA_CRITERIA: ProvaCriteria = {
  search: "",
  sortBy: "recentes",
};

function matchesSearch(prova: ProvaListItem, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    prova.titulo.toLowerCase().includes(term) ||
    (prova.descricao ?? "").toLowerCase().includes(term)
  );
}

const createdMs = (p: ProvaListItem): number => new Date(p.dataCriacao).getTime();

const COMPARATORS: Record<ProvaSort, (a: ProvaListItem, b: ProvaListItem) => number> = {
  recentes: (a, b) => createdMs(b) - createdMs(a),
  alfabetica: (a, b) => a.titulo.localeCompare(b.titulo),
  questoes: (a, b) => b.totalQuestoes - a.totalQuestoes,
};

/**
 * Aplica a busca por título/descrição e ordena. Não altera a lista recebida.
 * @example filterAndSortProvas(provas, { ...DEFAULT_PROVA_CRITERIA, sortBy: "questoes" })
 */
export function filterAndSortProvas(
  provas: ProvaListItem[],
  criteria: ProvaCriteria,
): ProvaListItem[] {
  const result = provas.filter((prova) => matchesSearch(prova, criteria.search));
  return result.sort(COMPARATORS[criteria.sortBy]);
}

/** Filtros ativos, para o rótulo. A busca não conta: já está visível na tela. */
export function countActiveProvaFilters(criteria: ProvaCriteria): number {
  return [criteria.sortBy !== "recentes" ? "1" : null].filter(Boolean).length;
}
