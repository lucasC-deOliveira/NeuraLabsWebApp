// Normalizes the model's deck-to-hierarchy response. Pure logic.

export interface PlanAssunto {
  nome: string;
  descricao: string;
}

export interface PlanTopico {
  nome: string;
  assunto: string;
  descricao: string;
}

export interface PlanConceito {
  nome: string;
  topico: string;
  descricao: string;
  indices: number[];
}

export interface PopulationPlan {
  assuntos: PlanAssunto[];
  topicos: PlanTopico[];
  conceitos: PlanConceito[];
}

interface RawPopulation {
  assuntos?: unknown;
  topicos?: unknown;
  conceitos?: unknown;
}

export function normalizePopulationPlan(parsed: RawPopulation): PopulationPlan {
  return {
    assuntos: arr(parsed?.assuntos).map((a) => ({
      nome: str(a.nome),
      descricao: str(a.descricao),
    })),
    topicos: arr(parsed?.topicos).map((t) => ({
      nome: str(t.nome),
      assunto: str(t.assunto),
      descricao: str(t.descricao),
    })),
    conceitos: arr(parsed?.conceitos).map((c) => ({
      nome: str(c.nome),
      topico: str(c.topico),
      descricao: str(c.descricao),
      indices: intList(c.indices),
    })),
  };
}

interface RawItem {
  nome?: unknown;
  descricao?: unknown;
  assunto?: unknown;
  topico?: unknown;
  indices?: unknown;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const arr = (v: unknown): RawItem[] => (Array.isArray(v) ? (v as RawItem[]) : []);
const intList = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : [];
