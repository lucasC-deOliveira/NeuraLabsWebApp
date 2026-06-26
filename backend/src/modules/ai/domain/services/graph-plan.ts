// Normalizes the model's full-graph plan into a capped, defaulted tree. Pure
// logic; node/edge creation happens in the use-case.

export interface PlanNota {
  titulo: string;
  conteudo: string;
}

export interface PlanFlashcard {
  pergunta: string;
  resposta: string;
}

export interface PlanConceito {
  nome: string;
  descricao: string;
  nota: PlanNota | null;
  flashcards: PlanFlashcard[];
}

export interface PlanTopico {
  nome: string;
  descricao: string;
  conceitos: PlanConceito[];
}

export interface GraphPlan {
  assunto: { nome: string; descricao: string };
  topicos: PlanTopico[];
  baralho: string;
}

const MAX_TOPICOS = 8;
const MAX_CONCEITOS = 6;
const MAX_FLASHCARDS = 4;

export function normalizeGraphPlan(parsed: unknown): GraphPlan {
  const p = (parsed ?? {}) as {
    assunto?: { nome?: unknown; descricao?: unknown };
    topicos?: unknown;
    baralho?: unknown;
  };
  return {
    assunto: { nome: nameOr(p.assunto?.nome, 'Assunto'), descricao: text(p.assunto?.descricao) },
    topicos: arr(p.topicos)
      .slice(0, MAX_TOPICOS)
      .map(toTopico)
      .filter((t) => t.nome),
    baralho: trimmed(p.baralho),
  };
}

interface RawNode {
  nome?: unknown;
  descricao?: unknown;
  conceitos?: unknown;
  nota?: { titulo?: unknown; conteudo?: unknown };
  flashcards?: unknown;
  pergunta?: unknown;
  resposta?: unknown;
}

function toTopico(t: RawNode): PlanTopico {
  return {
    nome: trimmed(t.nome),
    descricao: text(t.descricao),
    conceitos: arr(t.conceitos)
      .slice(0, MAX_CONCEITOS)
      .map(toConceito)
      .filter((c) => c.nome),
  };
}

function toConceito(c: RawNode): PlanConceito {
  return {
    nome: trimmed(c.nome),
    descricao: text(c.descricao),
    nota: toNota(c.nota),
    flashcards: arr(c.flashcards)
      .slice(0, MAX_FLASHCARDS)
      .map(toFlashcard)
      .filter((f) => f.pergunta && f.resposta),
  };
}

function toNota(n: { titulo?: unknown; conteudo?: unknown } | undefined): PlanNota | null {
  const titulo = trimmed(n?.titulo);
  return titulo ? { titulo, conteudo: text(n?.conteudo) } : null;
}

function toFlashcard(f: RawNode): PlanFlashcard {
  return { pergunta: trimmed(f.pergunta), resposta: trimmed(f.resposta) };
}

const trimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const nameOr = (v: unknown, fallback: string): string => trimmed(v) || fallback;
const arr = (v: unknown): RawNode[] => (Array.isArray(v) ? (v as RawNode[]) : []);
