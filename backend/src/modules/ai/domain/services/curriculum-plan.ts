// Normalizes the model's curriculum response and builds the "existing context"
// prompt fragment. Pure logic.

export interface NamedEntity {
  id: string;
  nome: string;
}

export interface ExistingCurriculum {
  assuntos: NamedEntity[];
  topicos: NamedEntity[];
  conceitos: NamedEntity[];
}

export interface PlanAssunto {
  nome: string;
  topicos: string[];
}

export interface PlanTopico {
  nome: string;
  conceitos: string[];
}

export interface CurriculumPlan {
  assuntos: PlanAssunto[];
  topicos: PlanTopico[];
  conceitos: string[];
}

interface RawCurriculum {
  assuntos?: unknown;
  topicos?: unknown;
  conceitos?: unknown;
}

export function normalizeCurriculumPlan(parsed: RawCurriculum): CurriculumPlan {
  return {
    assuntos: arr(parsed?.assuntos).map((a) => ({
      nome: name(a?.nome, 'Assunto'),
      topicos: strList(a?.topicos),
    })),
    topicos: arr(parsed?.topicos).map((t) => ({
      nome: name(t?.nome, 'Tópico'),
      conceitos: strList(t?.conceitos),
    })),
    conceitos: arr(parsed?.conceitos).map((c) => name(c?.nome, 'Conceito')),
  };
}

export function buildCurriculumContext(existing: ExistingCurriculum): string {
  return [
    namesLine('ASSUNTOS', existing.assuntos),
    namesLine('TÓPICOS', existing.topicos),
    namesLine('CONCEITOS', existing.conceitos),
  ]
    .filter(Boolean)
    .join('\n');
}

function namesLine(label: string, items: NamedEntity[]): string {
  return items.length ? `${label}: ${items.map((i) => i.nome).join(', ')}` : '';
}

interface RawItem {
  nome?: unknown;
  topicos?: unknown;
  conceitos?: unknown;
}

const name = (v: unknown, fallback: string): string => (typeof v === 'string' && v ? v : fallback);
const arr = (v: unknown): RawItem[] => (Array.isArray(v) ? (v as RawItem[]) : []);
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
