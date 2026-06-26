// Post-processing of the LLM's auto-link suggestions: keep edges whose endpoints
// exist, are distinct, form an allowed relation, do not already exist, and are
// not duplicated (same pair + relation in any direction). Capped. The "allowed"
// rule and the set of existing pairs come from the graph context (injected).

export interface AutoLinkNode {
  id: string;
  tipo: string;
  nome: string;
}

export interface RawAutoLink {
  sourceId?: unknown;
  targetId?: unknown;
  relacao?: unknown;
  motivo?: unknown;
}

export interface AutoLinkSuggestion {
  sourceId: string;
  targetId: string;
  sourceNome: string;
  targetNome: string;
  relacao: string;
  motivo: string;
}

export const MAX_AUTO_LINK_SUGGESTIONS = 15;

export type RelationPredicate = (
  sourceTipo: string,
  targetTipo: string,
  relacao: string,
) => boolean;

export function selectAutoLinkSuggestions(
  raw: RawAutoLink[],
  allNodes: AutoLinkNode[],
  existingPairs: ReadonlySet<string>,
  isAllowed: RelationPredicate,
): AutoLinkSuggestion[] {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const out: AutoLinkSuggestion[] = [];
  for (const s of raw) {
    const suggestion = toSuggestion(s, byId, existingPairs, seen, isAllowed);
    if (suggestion) out.push(suggestion);
    if (out.length >= MAX_AUTO_LINK_SUGGESTIONS) break;
  }
  return out;
}

interface ResolvedEdge {
  sourceId: string;
  targetId: string;
  src: AutoLinkNode;
  tgt: AutoLinkNode;
  relacao: string;
}

function toSuggestion(
  s: RawAutoLink,
  byId: Map<string, AutoLinkNode>,
  existingPairs: ReadonlySet<string>,
  seen: Set<string>,
  isAllowed: RelationPredicate,
): AutoLinkSuggestion | null {
  const edge = resolveEdge(s, byId, isAllowed);
  if (!edge || alreadyLinked(edge.sourceId, edge.targetId, existingPairs)) return null;
  const key = `${[edge.sourceId, edge.targetId].sort().join(':')}:${edge.relacao}`;
  if (seen.has(key)) return null;
  seen.add(key);
  return buildSuggestion(edge, s.motivo);
}

function buildSuggestion(edge: ResolvedEdge, motivo: unknown): AutoLinkSuggestion {
  return {
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    sourceNome: edge.src.nome,
    targetNome: edge.tgt.nome,
    relacao: edge.relacao,
    motivo: typeof motivo === 'string' ? motivo : '',
  };
}

function resolveEdge(
  s: RawAutoLink,
  byId: Map<string, AutoLinkNode>,
  isAllowed: RelationPredicate,
): ResolvedEdge | null {
  const ids = edgeIds(s);
  if (!ids) return null;
  const src = byId.get(ids.sourceId);
  const tgt = byId.get(ids.targetId);
  if (!src || !tgt || !isAllowed(src.tipo, tgt.tipo, ids.relacao)) return null;
  return { ...ids, src, tgt };
}

function edgeIds(s: RawAutoLink): { sourceId: string; targetId: string; relacao: string } | null {
  if (typeof s?.sourceId !== 'string' || typeof s?.targetId !== 'string') return null;
  if (typeof s?.relacao !== 'string' || s.sourceId === s.targetId) return null;
  return { sourceId: s.sourceId, targetId: s.targetId, relacao: s.relacao };
}

function alreadyLinked(a: string, b: string, existingPairs: ReadonlySet<string>): boolean {
  return existingPairs.has(`${a}:${b}`) || existingPairs.has(`${b}:${a}`);
}
