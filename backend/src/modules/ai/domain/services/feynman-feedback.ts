import type { FeynmanFeedback, FeynmanGap } from '../feynman-views';

interface RawGap {
  ponto?: unknown;
  conceito?: unknown;
}
interface RawFeedback {
  clareza?: unknown;
  jargao?: unknown;
  lacunas?: unknown;
  analogia?: unknown;
  reescrita?: unknown;
}

function clamp0100(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 8);
}

// Mapeia cada lacuna para o id do conceito pelo nome (a IA só usa nomes da lista).
function mapGaps(value: unknown, byName: Map<string, string>): FeynmanGap[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((g): g is RawGap => typeof g === 'object' && g !== null && typeof g.ponto === 'string')
    .slice(0, 8)
    .map((g) => ({
      ponto: String(g.ponto),
      conceitoId: byName.get(String(g.conceito ?? '').toLowerCase()) ?? null,
    }));
}

// Valida/normaliza a saída da LLM num FeynmanFeedback seguro (clamp + mapeamento).
export function parseFeynmanFeedback(
  raw: unknown,
  candidatos: { id: string; nome: string }[],
): FeynmanFeedback {
  const byName = new Map(candidatos.map((c) => [c.nome.toLowerCase(), c.id]));
  const r = (raw ?? {}) as RawFeedback;
  return {
    clareza: clamp0100(r.clareza),
    jargao: strList(r.jargao),
    lacunas: mapGaps(r.lacunas, byName),
    analogia: typeof r.analogia === 'string' ? r.analogia : '',
    reescrita: typeof r.reescrita === 'string' ? r.reescrita : '',
  };
}
