// Filtro e ordenação das questões de uma prova aberta. Lógica pura.
// O casamento por tags é compartilhado com a lista de questões e o baralho (@/lib).
import {
  matchesConceptTags,
  matchesTagText,
  conceptTagOptions,
  type ConceptTagOptions,
} from "@/lib/concept-tag-filters";
import type { ProvaQuestaoItem } from "../prova.types";
import type { TipoQuestao } from "@/modules/questions/domain/questao.types";

// "ordem" é o padrão e o único que a prova tem de nascença: uma prova é uma
// sequência numerada — a questão 1 vem antes da 2. Os outros são conveniência.
export type ProvaQuestaoSort = "ordem" | "enunciado" | "tipo";

export interface ProvaQuestaoCriteria {
  search: string;
  // "" = todos. Os três níveis vêm dos conceitos que a questão testa no grafo.
  tipo: TipoQuestao | "";
  assuntoId: string;
  topicoId: string;
  conceito: string;
  sortBy: ProvaQuestaoSort;
}

export const DEFAULT_PROVA_QUESTAO_CRITERIA: ProvaQuestaoCriteria = {
  search: "",
  tipo: "",
  assuntoId: "",
  topicoId: "",
  conceito: "",
  sortBy: "ordem",
};

// A busca cobre o enunciado, a explicação, as alternativas e as tags — tudo que a
// questão mostra na tela.
function matchesSearch(questao: ProvaQuestaoItem, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    questao.enunciado.toLowerCase().includes(term) ||
    (questao.explicacao ?? "").toLowerCase().includes(term) ||
    (questao.alternativas ?? []).some((a) => a.texto.toLowerCase().includes(term)) ||
    matchesTagText(questao.conceitosConectados, term)
  );
}

const COMPARATORS: Record<ProvaQuestaoSort, (a: ProvaQuestaoItem, b: ProvaQuestaoItem) => number> = {
  ordem: (a, b) => a.ordem - b.ordem,
  enunciado: (a, b) => a.enunciado.localeCompare(b.enunciado),
  tipo: (a, b) => a.tipo.localeCompare(b.tipo),
};

/**
 * Aplica busca, tipo e os três níveis das tags, depois ordena. Não altera a lista.
 * @example filterAndSortProvaQuestoes(prova.questoes, { ...DEFAULT_PROVA_QUESTAO_CRITERIA, conceito: "Mitose" })
 */
export function filterAndSortProvaQuestoes(
  questoes: ProvaQuestaoItem[],
  criteria: ProvaQuestaoCriteria,
): ProvaQuestaoItem[] {
  const result = questoes.filter(
    (questao) =>
      matchesSearch(questao, criteria.search) &&
      (!criteria.tipo || questao.tipo === criteria.tipo) &&
      matchesConceptTags(questao, criteria),
  );
  return result.sort(COMPARATORS[criteria.sortBy]);
}

/** Tipos presentes na prova, em ordem — o filtro só oferece o que existe. */
export function provaQuestaoTipoOptions(questoes: ProvaQuestaoItem[]): TipoQuestao[] {
  const tipos = new Set<TipoQuestao>();
  for (const questao of questoes) tipos.add(questao.tipo);
  return [...tipos].sort();
}

/** Níveis presentes nas tags das questões da prova, para alimentar os filtros. */
export function provaQuestaoTagOptions(questoes: ProvaQuestaoItem[]): ConceptTagOptions {
  return conceptTagOptions(questoes);
}

/** Filtros ativos, para o rótulo. A busca não conta: já está visível na tela. */
export function countActiveProvaQuestaoFilters(criteria: ProvaQuestaoCriteria): number {
  return [
    criteria.tipo || null,
    criteria.assuntoId || null,
    criteria.topicoId || null,
    criteria.conceito || null,
    criteria.sortBy !== "ordem" ? "1" : null,
  ].filter(Boolean).length;
}
