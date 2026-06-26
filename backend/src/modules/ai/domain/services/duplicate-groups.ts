// Post-processing of the LLM's duplicate-detection output. The model references
// nodes by numeric index (to save tokens); this resolves them back, keeps only
// groups of 2+ nodes that are all the same type, and caps the result.

export interface DuplicateNode {
  id: string;
  nome: string;
  tipo: string;
}

export interface RawGroup {
  indices?: unknown;
  sugestao?: unknown;
}

export interface DuplicateGroup {
  nodes: DuplicateNode[];
  sugestao: string;
}

export const MAX_DUPLICATE_GROUPS = 15;

export function selectDuplicateGroups(
  raw: RawGroup[],
  allNodes: DuplicateNode[],
): DuplicateGroup[] {
  const out: DuplicateGroup[] = [];
  for (const g of raw) {
    const nodes = resolveNodes(g?.indices, allNodes);
    if (!isSameTypeGroup(nodes)) continue;
    out.push({ nodes, sugestao: typeof g?.sugestao === 'string' ? g.sugestao : '' });
    if (out.length >= MAX_DUPLICATE_GROUPS) break;
  }
  return out;
}

function resolveNodes(indices: unknown, allNodes: DuplicateNode[]): DuplicateNode[] {
  if (!Array.isArray(indices)) return [];
  return indices
    .map((i) => (typeof i === 'number' ? allNodes[i] : undefined))
    .filter((n): n is DuplicateNode => !!n)
    .map((n) => ({ id: n.id, nome: n.nome, tipo: n.tipo }));
}

function isSameTypeGroup(nodes: DuplicateNode[]): boolean {
  return nodes.length >= 2 && nodes.every((n) => n.tipo === nodes[0].tipo);
}
