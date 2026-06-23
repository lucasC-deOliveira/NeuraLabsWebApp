// Pure domain: how mastery flows through the knowledge graph and how a
// flashcard's mastery decays over time. No I/O, no framework.

export type GraphNode = {
  id: string;
  label: string;
  type:
    | 'ASSUNTO'
    | 'TOPICO'
    | 'CONCEITO'
    | 'FLASHCARD'
    | 'NOTA'
    | 'TEXTO_BRUTO'
    | 'BARALHO'
    | 'GRAFO_REF'
    | 'QUESTION'
    | 'PROVA';
  nivelDominio: number;
  prioridadeRevisao: number;
  parentId?: string;
  pergunta?: string;
  grafoRefMeta?: { nome: string; nodeCount: number; tipoRelacao: string | null };
  posicaoX?: number | null;
  posicaoY?: number | null;
  /** Root subject of the graph (fixed at the center, anchors the layout, non-deletable). */
  isRoot?: boolean;
};

export type GraphEdge = { source: string; target: string; type: string; peso: number };

const MS_PER_DAY = 86_400_000;
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

// Relations that carry mastery (source→target) when propagating domain level.
const DOMAIN_CARRYING = new Set<string>([
  'TESTA',
  'HERDA',
  'DEFINE',
  'EXPLICA',
  'APROFUNDA',
  'EXEMPLIFICA',
  'CONTRASTA',
  'SINTETIZA',
  'ALERTA_ERRO',
  'PERTENCE_A',
  'FUNDAMENTA',
  'APLICADO_EM',
]);
const DOMAIN_TARGET_TYPES = new Set(['ASSUNTO', 'TOPICO', 'CONCEITO', 'NOTA']);

export interface MasteryInput {
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
}

// A flashcard's current mastery: base from difficulty, decayed by how overdue it is.
export function computeMastery(ap: MasteryInput, nowMs: number): number {
  const base = clamp01(1 - ap.dificuldade / 10);
  const daysOverdue = Math.max(0, (nowMs - new Date(ap.proximaRevisao).getTime()) / MS_PER_DAY);
  const interval = Math.max(1, ap.intervalo);
  const decay = Math.exp(-daysOverdue / interval);
  return base * decay;
}

type Adjacency = Map<string, Array<{ to: string; peso: number }>>;
interface Contribution {
  weighted: number;
  weight: number;
}

// Adjacency list of domain-carrying edges only (peso defaults to 1).
function buildAdjacency(edges: GraphEdge[]): Adjacency {
  const adj: Adjacency = new Map();
  for (const e of edges) {
    if (!DOMAIN_CARRYING.has(e.type)) continue;
    const peso = typeof e.peso === 'number' && e.peso > 0 ? e.peso : 1;
    const list = adj.get(e.source) ?? [];
    list.push({ to: e.target, peso });
    adj.set(e.source, list);
  }
  return adj;
}

// Visits the unseen neighbors of `cur`, accumulating their weighted mastery.
function visitNeighbors(
  cur: string,
  strength: Map<string, number>,
  queue: string[],
  adj: Adjacency,
  mastery: number,
  acc: Map<string, Contribution>,
): void {
  const s = strength.get(cur)!;
  for (const { to, peso } of adj.get(cur) ?? []) {
    if (strength.has(to)) continue;
    const sNext = s * peso;
    strength.set(to, sNext);
    queue.push(to);
    const a = acc.get(to) ?? { weighted: 0, weight: 0 };
    acc.set(to, { weighted: a.weighted + mastery * sNext, weight: a.weight + sNext });
  }
}

// Weighted BFS from one flashcard into the accumulator.
function propagateFrom(
  fcId: string,
  mastery: number,
  adj: Adjacency,
  acc: Map<string, Contribution>,
): void {
  const strength = new Map<string, number>([[fcId, 1]]);
  const queue = [fcId];
  for (let head = 0; head < queue.length; head++) {
    visitNeighbors(queue[head], strength, queue, adj, mastery, acc);
  }
}

function accumulate(
  adj: Adjacency,
  flashcardMastery: Map<string, number>,
): Map<string, Contribution> {
  const acc = new Map<string, Contribution>();
  for (const [fcId, mastery] of flashcardMastery) propagateFrom(fcId, mastery, adj, acc);
  return acc;
}

function assignDomain(
  nodes: GraphNode[],
  flashcardMastery: Map<string, number>,
  acc: Map<string, Contribution>,
): void {
  for (const node of nodes) {
    if (node.type === 'FLASHCARD') {
      node.nivelDominio = flashcardMastery.get(node.id) ?? node.nivelDominio;
    } else if (DOMAIN_TARGET_TYPES.has(node.type)) {
      const a = acc.get(node.id);
      node.nivelDominio = a && a.weight > 0 ? clamp01(a.weighted / a.weight) : 0;
    }
  }
}

// Propagates flashcard mastery through domain-carrying edges (weighted BFS) and
// writes each node's nivelDominio in place.
export function applyDomainFromFlashcards(
  nodes: GraphNode[],
  edges: GraphEdge[],
  flashcardMastery: Map<string, number>,
): void {
  const adj = buildAdjacency(edges);
  const acc = accumulate(adj, flashcardMastery);
  assignDomain(nodes, flashcardMastery, acc);
}
