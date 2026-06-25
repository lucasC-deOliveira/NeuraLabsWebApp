// Validates the model's missing-prerequisite suggestions and resolves each
// shouldConnectTo reference to an existing node (by exact name, id, then partial
// name match), capping the result. Pure logic.

export interface PrereqNode {
  id: string;
  tipo: string;
  nome: string;
}

export interface RawConnect {
  id?: unknown;
  nome?: unknown;
}

export interface RawPrerequisite {
  nome?: unknown;
  tipo?: unknown;
  motivo?: unknown;
  shouldConnectTo?: RawConnect[];
}

export interface PrereqConnection {
  id: string;
  nome: string;
}

export interface MissingPrerequisite {
  nome: string;
  tipo: string;
  motivo: string;
  shouldConnectTo: PrereqConnection[];
}

const MAX_PREREQUISITES = 8;

export function selectMissingPrerequisites(
  raw: RawPrerequisite[],
  allNodes: PrereqNode[],
): MissingPrerequisite[] {
  const byNome = new Map(allNodes.map((n) => [n.nome.toLowerCase().trim(), n]));
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const out: MissingPrerequisite[] = [];
  for (const p of raw) {
    const entry = toEntry(p, byNome, byId);
    if (entry) out.push(entry);
    if (out.length >= MAX_PREREQUISITES) break;
  }
  return out;
}

const asNome = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const asTipo = (v: unknown): string => (v === 'TOPICO' || v === 'CONCEITO' ? v : 'CONCEITO');
const asMotivo = (v: unknown): string => (typeof v === 'string' ? v : '');

function toEntry(
  p: RawPrerequisite,
  byNome: Map<string, PrereqNode>,
  byId: Map<string, PrereqNode>,
): MissingPrerequisite | null {
  const nome = asNome(p?.nome);
  if (!nome) return null;
  const shouldConnectTo = resolveConnects(p?.shouldConnectTo ?? [], byNome, byId);
  return { nome, tipo: asTipo(p?.tipo), motivo: asMotivo(p?.motivo), shouldConnectTo };
}

function resolveConnects(
  raw: RawConnect[],
  byNome: Map<string, PrereqNode>,
  byId: Map<string, PrereqNode>,
): PrereqConnection[] {
  const resolved: PrereqConnection[] = [];
  for (const c of raw) {
    const node = resolveNode(c, byNome, byId);
    if (node) resolved.push({ id: node.id, nome: node.nome });
  }
  return resolved;
}

function resolveNode(
  c: RawConnect,
  byNome: Map<string, PrereqNode>,
  byId: Map<string, PrereqNode>,
): PrereqNode | undefined {
  const query = String(c?.nome ?? '')
    .toLowerCase()
    .trim();
  return byNome.get(query) ?? byId.get(String(c?.id ?? '')) ?? partialMatch(query, byNome);
}

// Mirrors the legacy heuristic: substring match in either direction (an empty
// query therefore matches the first node — preserved for compatibility).
function partialMatch(query: string, byNome: Map<string, PrereqNode>): PrereqNode | undefined {
  return [...byNome.entries()].find(([k]) => k.includes(query) || query.includes(k))?.[1];
}
