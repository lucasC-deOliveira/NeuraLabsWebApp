import type { LlmMessage } from '../ports/llm-port';

// Normalizes the model's edital plan into a capped, defaulted tree that mirrors
// the notice's own hierarchy: DISCIPLINA → ASSUNTO, numbered topic → TÓPICO,
// sub-item → CONCEITO. Structure only (no notas/flashcards). Pure.

export interface EditalTopico {
  nome: string;
  conceitos: string[];
}

export interface EditalAssunto {
  nome: string;
  topicos: EditalTopico[];
}

export interface EditalPlan {
  assuntos: EditalAssunto[];
}

const MAX_ASSUNTOS = 20;
const MAX_TOPICOS = 30;
const MAX_CONCEITOS = 20;

export const EDITAL_SYSTEM_PROMPT = `Você organiza o CONTEÚDO PROGRAMÁTICO (objetos de avaliação) de um edital em um grafo de conhecimento, PRESERVANDO a estrutura do edital.
Mapeamento obrigatório:
- Cada DISCIPLINA (ex.: "LÍNGUA PORTUGUESA", "ENGENHARIA DE SOFTWARE") vira um ASSUNTO.
- Cada tópico numerado (1, 2, 3, …) vira um TÓPICO do respectivo assunto.
- Cada subitem (4.1, 5.2, 2.1.5, …) vira um CONCEITO do respectivo tópico.
- Se um tópico numerado não tiver subitens, gere um único CONCEITO com o mesmo nome do tópico.
- NÃO invente conteúdo fora do edital; NÃO gere explicações nem flashcards.
- Reutilize EXATAMENTE os nomes de nós já existentes no grafo quando forem equivalentes.
Responda APENAS JSON válido (sem markdown):
{ "assuntos": [ { "nome": "...", "topicos": [ { "nome": "...", "conceitos": ["...", "..."] } ] } ] }`;

export function editalPlanMessages(syllabus: string, existingContext: string): LlmMessage[] {
  return [
    { role: 'system', content: EDITAL_SYSTEM_PROMPT + existingContext },
    { role: 'user', content: syllabus.slice(0, 15000) },
  ];
}

interface RawAssunto {
  nome?: unknown;
  topicos?: unknown;
}
interface RawTopico {
  nome?: unknown;
  conceitos?: unknown;
}

/** @example normalizeEditalPlan(parsedJson) */
export function normalizeEditalPlan(parsed: unknown): EditalPlan {
  const p = (parsed ?? {}) as { assuntos?: unknown };
  return {
    assuntos: arr(p.assuntos)
      .slice(0, MAX_ASSUNTOS)
      .map(toAssunto)
      .filter((a) => a.nome !== '' && a.topicos.length > 0),
  };
}

function toAssunto(raw: unknown): EditalAssunto {
  const a = (raw ?? {}) as RawAssunto;
  return {
    nome: trimmed(a.nome),
    topicos: arr(a.topicos)
      .slice(0, MAX_TOPICOS)
      .map(toTopico)
      .filter((t) => t.nome !== ''),
  };
}

function toTopico(raw: unknown): EditalTopico {
  const t = (raw ?? {}) as RawTopico;
  const nome = trimmed(t.nome);
  const conceitos = names(t.conceitos).slice(0, MAX_CONCEITOS);
  // A leaf topic (no sub-items) still gets a concept of its own name to anchor content.
  return { nome, conceitos: conceitos.length > 0 ? conceitos : nome ? [nome] : [] };
}

function names(value: unknown): string[] {
  const seen = new Set<string>();
  return arr(value)
    .map((c) => (typeof c === 'string' ? c : trimmed((c as RawTopico)?.nome)))
    .map((s) => s.trim())
    .filter((s) => s !== '' && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
}

const trimmed = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
