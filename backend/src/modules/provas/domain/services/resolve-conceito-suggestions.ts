import type { CatalogoConceitos, ConceitoSugerido, QuestaoConceitos } from '../prova';
import { conceitoNameIndex } from './conceito-catalog';

// Parses the classifier's JSON and resolves each suggested concept name back to
// an existing graph node id (case-insensitive) or null (a new concept the user
// can accept in the review). Tolerates a markdown-fenced payload. Pure.

interface RawQuestao {
  numero?: unknown;
  conceitos?: unknown;
}

/**
 * @example resolveConceitoSuggestions(llmContent, catalogo)
 */
export function resolveConceitoSuggestions(
  rawContent: string,
  catalogo: CatalogoConceitos,
): QuestaoConceitos[] {
  const index = conceitoNameIndex(catalogo);
  const parsed = parseJson(rawContent) as { questoes?: unknown };
  return asArray(parsed.questoes).map((raw) => toQuestaoConceitos(raw as RawQuestao, index));
}

function toQuestaoConceitos(raw: RawQuestao, index: Map<string, string>): QuestaoConceitos {
  return {
    numero: typeof raw.numero === 'number' ? raw.numero : 0,
    conceitos: dedupeNames(asArray(raw.conceitos)).map((nome) => resolve(nome, index)),
  };
}

function resolve(nome: string, index: Map<string, string>): ConceitoSugerido {
  return { nome, conceitoId: index.get(nome.toLowerCase()) ?? null };
}

function dedupeNames(values: unknown[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of values) {
    const nome = String(value ?? '').trim();
    if (nome === '' || seen.has(nome.toLowerCase())) continue;
    seen.add(nome.toLowerCase());
    names.push(nome);
  }
  return names;
}

function parseJson(rawContent: string): { questoes?: unknown } {
  const candidate = rawContent.trim() || '{}';
  try {
    return JSON.parse(candidate) as { questoes?: unknown };
  } catch {
    const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? (JSON.parse(fenced[1].trim()) as { questoes?: unknown }) : {};
  }
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
