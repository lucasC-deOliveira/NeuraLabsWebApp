// Post-processing of the LLM's note→graph relation suggestions: keep only real
// candidates, allowed relations and the first per node, capped. The "is this
// relation allowed" rule belongs to the graph context, so it is injected.

export type CandidateTipo = 'ASSUNTO' | 'TOPICO' | 'CONCEITO';

export interface RelationCandidate {
  id: string;
  tipo: CandidateTipo;
  nome: string;
  descricao: string | null;
}

export interface RawSuggestion {
  nodeId?: unknown;
  relacao?: unknown;
  motivo?: unknown;
}

export interface NotaRelationSuggestion {
  nodeId: string;
  nodeTipo: CandidateTipo;
  nodeNome: string;
  relacao: string;
  motivo: string;
}

export const MAX_NOTA_RELATIONS = 8;

export function selectNotaRelations(
  raw: RawSuggestion[],
  candidates: RelationCandidate[],
  isAllowed: (tipo: CandidateTipo, relacao: string) => boolean,
): NotaRelationSuggestion[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const out: NotaRelationSuggestion[] = [];
  for (const s of raw) {
    const cand = typeof s?.nodeId === 'string' ? byId.get(s.nodeId) : undefined;
    if (!cand || seen.has(cand.id)) continue;
    if (typeof s.relacao !== 'string' || !isAllowed(cand.tipo, s.relacao)) continue;
    seen.add(cand.id);
    out.push(toSuggestion(cand, s.relacao, s.motivo));
    if (out.length >= MAX_NOTA_RELATIONS) break;
  }
  return out;
}

function toSuggestion(
  cand: RelationCandidate,
  relacao: string,
  motivo: unknown,
): NotaRelationSuggestion {
  return {
    nodeId: cand.id,
    nodeTipo: cand.tipo,
    nodeNome: cand.nome,
    relacao,
    motivo: typeof motivo === 'string' ? motivo : '',
  };
}
