import { InvalidExamJsonError } from '../errors';
import type { ParsedAlternativa, ParsedQuestao, ParsedUpload } from '../prova';

/**
 * Normalizes the LLM's raw completion into a ParsedUpload: extracts the JSON
 * (tolerating a markdown fence), coerces each question into our shape, uppercases
 * answer keys, and drops questions with an empty enunciado.
 * @example parseExamResponse('{"questoes":[...]}')
 */
export function parseExamResponse(rawContent: string): ParsedUpload {
  const parsed = extractJson(rawContent) as {
    tituloSugerido?: unknown;
    questoes?: unknown;
  };
  const questoes = asArray(parsed.questoes)
    .map(toParsedQuestao)
    .filter((q) => q.enunciado.length > 0);
  return { tituloSugerido: asTitulo(parsed.tituloSugerido), questoes };
}

function extractJson(rawContent: string): unknown {
  const candidate = rawContent.trim() || '{}';
  try {
    return JSON.parse(candidate);
  } catch {
    const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!fenced) throw new InvalidExamJsonError();
    return JSON.parse(fenced[1].trim());
  }
}

function toParsedQuestao(raw: unknown, index: number): ParsedQuestao {
  const q = (raw ?? {}) as Record<string, unknown>;
  return {
    numero: typeof q.numero === 'number' ? q.numero : index + 1,
    enunciado: String(q.enunciado ?? '').trim(),
    tipo: q.tipo === 'VERDADEIRO_FALSO' ? 'VERDADEIRO_FALSO' : 'MULTIPLA_ESCOLHA',
    alternativas: asAlternativas(q.alternativas),
    gabarito: String(q.gabarito ?? '?').toUpperCase(),
    explicacao: q.explicacao != null ? String(q.explicacao) : null,
  };
}

function asAlternativas(value: unknown): ParsedAlternativa[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value as ParsedAlternativa[];
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asTitulo = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;
