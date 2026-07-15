// Filtro e ordenação da lista de questões. Lógica pura.
// O casamento por tags é compartilhado com o baralho aberto (@/lib).
import {
  matchesConceptTags,
  matchesTagText,
  conceptTagOptions,
  type ConceptTagOptions,
} from "@/lib/concept-tag-filters";
import type { QuestaoListItem, TipoQuestao } from "../questao.types";

export type QuestaoSort = "recentes" | "enunciado" | "tipo";

export interface QuestaoCriteria {
  search: string;
  // "" = todos. Os três níveis vêm dos conceitos que a questão testa no grafo.
  tipo: TipoQuestao | "";
  assuntoId: string;
  topicoId: string;
  conceito: string;
  sortBy: QuestaoSort;
}

export const DEFAULT_QUESTAO_CRITERIA: QuestaoCriteria = {
  search: "",
  tipo: "",
  assuntoId: "",
  topicoId: "",
  conceito: "",
  sortBy: "recentes",
};

export const TIPO_LABELS: Record<TipoQuestao, string> = {
  MULTIPLA_ESCOLHA: "Múltipla escolha",
  VERDADEIRO_FALSO: "Verdadeiro ou Falso",
};

// A busca cobre o enunciado, a explicação, as alternativas e as tags — tudo que a
// questão mostra na tela.
function matchesSearch(questao: QuestaoListItem, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    questao.enunciado.toLowerCase().includes(term) ||
    (questao.explicacao ?? "").toLowerCase().includes(term) ||
    (questao.alternativas ?? []).some((a) => a.texto.toLowerCase().includes(term)) ||
    matchesTagText(questao.conceitosConectados, term)
  );
}

const createdMs = (q: QuestaoListItem): number => new Date(q.dataCriacao).getTime();

const COMPARATORS: Record<QuestaoSort, (a: QuestaoListItem, b: QuestaoListItem) => number> = {
  recentes: (a, b) => createdMs(b) - createdMs(a),
  enunciado: (a, b) => a.enunciado.localeCompare(b.enunciado),
  tipo: (a, b) => a.tipo.localeCompare(b.tipo),
};

/**
 * Aplica busca, tipo e os três níveis das tags, depois ordena. Não altera a lista.
 * @example filterAndSortQuestoes(questoes, { ...DEFAULT_QUESTAO_CRITERIA, tipo: "MULTIPLA_ESCOLHA" })
 */
export function filterAndSortQuestoes(
  questoes: QuestaoListItem[],
  criteria: QuestaoCriteria,
): QuestaoListItem[] {
  const result = questoes.filter(
    (questao) =>
      matchesSearch(questao, criteria.search) &&
      (!criteria.tipo || questao.tipo === criteria.tipo) &&
      matchesConceptTags(questao, criteria),
  );
  return result.sort(COMPARATORS[criteria.sortBy]);
}

/** Tipos presentes na lista, em ordem — o filtro só oferece o que existe. */
export function questaoTipoOptions(questoes: QuestaoListItem[]): TipoQuestao[] {
  const tipos = new Set<TipoQuestao>();
  for (const questao of questoes) tipos.add(questao.tipo);
  return [...tipos].sort();
}

/** Níveis presentes nas tags das questões, para alimentar os filtros. */
export function questaoTagOptions(questoes: QuestaoListItem[]): ConceptTagOptions {
  return conceptTagOptions(questoes);
}

/** Filtros ativos, para o rótulo. A busca não conta: já está visível na tela. */
export function countActiveQuestaoFilters(criteria: QuestaoCriteria): number {
  return [
    criteria.tipo || null,
    criteria.assuntoId || null,
    criteria.topicoId || null,
    criteria.conceito || null,
    criteria.sortBy !== "recentes" ? "1" : null,
  ].filter(Boolean).length;
}
