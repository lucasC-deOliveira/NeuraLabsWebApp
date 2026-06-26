// Post-processing of the LLM's completeness assessment: resolve each entry back
// to a real subject (by exact name, id, then partial name), clamp the score to
// 0–10 and keep at most six short strings per list.

export interface AssessmentSubject {
  id: string;
  nome: string;
}

export interface RawAssessment {
  assuntoNome?: unknown;
  nome?: unknown;
  assuntoId?: unknown;
  score?: unknown;
  wellCovered?: unknown;
  shallow?: unknown;
  missing?: unknown;
}

export interface CompletenessAssessment {
  assuntoId: string;
  assuntoNome: string;
  score: number;
  wellCovered: string[];
  shallow: string[];
  missing: string[];
}

export const MAX_ASSESSMENT_ITEMS = 6;

export function selectCompletenessAssessments(
  raw: RawAssessment[],
  assuntos: AssessmentSubject[],
): CompletenessAssessment[] {
  const byNome = new Map(assuntos.map((a) => [a.nome.toLowerCase().trim(), a]));
  const byId = new Map(assuntos.map((a) => [a.id, a]));
  const out: CompletenessAssessment[] = [];
  for (const a of raw) {
    const subject = resolveSubject(a, byId, byNome);
    if (subject) out.push(toAssessment(subject, a));
  }
  return out;
}

function resolveSubject(
  a: RawAssessment,
  byId: Map<string, AssessmentSubject>,
  byNome: Map<string, AssessmentSubject>,
): AssessmentSubject | undefined {
  const nomeBusca = subjectQuery(a);
  const byIdHit = typeof a?.assuntoId === 'string' ? byId.get(a.assuntoId) : undefined;
  return byNome.get(nomeBusca) ?? byIdHit ?? partialMatch(nomeBusca, byNome);
}

function subjectQuery(a: RawAssessment): string {
  return String(a?.assuntoNome ?? a?.nome ?? a?.assuntoId ?? '')
    .toLowerCase()
    .trim();
}

function partialMatch(
  nomeBusca: string,
  byNome: Map<string, AssessmentSubject>,
): AssessmentSubject | undefined {
  for (const [k, subject] of byNome) {
    if (k.includes(nomeBusca) || nomeBusca.includes(k)) return subject;
  }
  return undefined;
}

function toAssessment(subject: AssessmentSubject, a: RawAssessment): CompletenessAssessment {
  return {
    assuntoId: subject.id,
    assuntoNome: subject.nome,
    score: clampScore(a?.score),
    wellCovered: strList(a?.wellCovered),
    shallow: strList(a?.shallow),
    missing: strList(a?.missing),
  };
}

function clampScore(score: unknown): number {
  return typeof score === 'number' ? Math.min(10, Math.max(0, Math.round(score))) : 5;
}

function strList(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((s): s is string => typeof s === 'string').slice(0, MAX_ASSESSMENT_ITEMS)
    : [];
}
