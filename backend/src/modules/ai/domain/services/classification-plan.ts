// The reviewable output of a classification chunk: the model's population plan
// with chunk-local indices translated to flashcard ids, so the review UI and the
// apply step are self-contained (no index/offset coupling between calls). Pure logic.

import {
  normalizePopulationPlan,
  type PlanAssunto,
  type PlanTopico,
  type PopulationPlan,
} from './population-plan';

export interface ClassificationConcept {
  nome: string;
  topico: string;
  descricao: string;
  flashcardIds: string[];
}

export interface ClassificationPlan {
  assuntos: PlanAssunto[];
  topicos: PlanTopico[];
  conceitos: ClassificationConcept[];
}

export interface RawClassificationPlan {
  assuntos?: unknown;
  topicos?: unknown;
  conceitos?: unknown;
}

/** Translates chunk-local indices into flashcard ids, dropping out-of-range ones. */
export function toClassificationPlan(plan: PopulationPlan, cardIds: string[]): ClassificationPlan {
  return {
    assuntos: plan.assuntos,
    topicos: plan.topicos,
    conceitos: plan.conceitos.map((c) => ({
      nome: c.nome,
      topico: c.topico,
      descricao: c.descricao,
      flashcardIds: c.indices.filter((i) => i >= 0 && i < cardIds.length).map((i) => cardIds[i]),
    })),
  };
}

/** Sanitizes a plan coming back from the review UI (untrusted HTTP boundary). */
export function normalizeClassificationPlan(parsed: RawClassificationPlan): ClassificationPlan {
  const base = normalizePopulationPlan(parsed);
  const raw = Array.isArray(parsed?.conceitos)
    ? (parsed.conceitos as { flashcardIds?: unknown }[])
    : [];
  return {
    assuntos: base.assuntos,
    topicos: base.topicos,
    conceitos: base.conceitos.map((c, i) => ({
      nome: c.nome,
      topico: c.topico,
      descricao: c.descricao,
      flashcardIds: strList(raw[i]?.flashcardIds),
    })),
  };
}

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
