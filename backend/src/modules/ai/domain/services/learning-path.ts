// Post-processing of the LLM's learning-path steps: resolve each step back to a
// real node (by exact name, then id, then a partial-name match), dropping
// duplicates and unresolved steps while preserving order.

export interface PathNode {
  id: string;
  nome: string;
  tipo: string;
}

export interface RawStep {
  nodeId?: unknown;
  nome?: unknown;
  motivo?: unknown;
}

export interface PathStep {
  nodeId: string;
  nome: string;
  tipo: string;
  motivo: string;
}

export function selectLearningPath(raw: RawStep[], allNodes: PathNode[]): PathStep[] {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const byNome = new Map(allNodes.map((n) => [n.nome.toLowerCase().trim(), n]));
  const seen = new Set<string>();
  const out: PathStep[] = [];
  for (const s of raw) {
    const node = resolveStepNode(s, byId, byNome);
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);
    out.push({ nodeId: node.id, nome: node.nome, tipo: node.tipo, motivo: asMotivo(s) });
  }
  return out;
}

function resolveStepNode(
  s: RawStep,
  byId: Map<string, PathNode>,
  byNome: Map<string, PathNode>,
): PathNode | undefined {
  const nomeBusca = String(s?.nome ?? '')
    .toLowerCase()
    .trim();
  const byIdHit = typeof s?.nodeId === 'string' ? byId.get(s.nodeId) : undefined;
  return byNome.get(nomeBusca) ?? byIdHit ?? partialMatch(nomeBusca, byNome);
}

function partialMatch(nomeBusca: string, byNome: Map<string, PathNode>): PathNode | undefined {
  for (const [k, node] of byNome) {
    if (k.includes(nomeBusca) || nomeBusca.includes(k)) return node;
  }
  return undefined;
}

function asMotivo(s: RawStep): string {
  return typeof s?.motivo === 'string' ? s.motivo : '';
}
