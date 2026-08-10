import { isRelationAllowed } from './relation-rules';

// Vault payload (desktop Push): nodes + edges keyed by referenciaId (ref).
export interface VaultAlternativa {
  letra: string;
  texto: string;
}

export interface VaultNode {
  ref: string;
  tipo: string;
  nome?: string;
  descricao?: string | null;
  pergunta?: string;
  resposta?: string;
  titulo?: string;
  conteudo?: string;
  tipoNota?: string;
  subtipo?: string;
  fonte?: string | null;
  texto?: string;
  enunciado?: string;
  alternativas?: VaultAlternativa[];
  gabarito?: string;
  explicacao?: string | null;
  tipoQuestao?: string;
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
  pesoEdital?: number | null;
}
export interface VaultEdge {
  origem: string;
  destino: string;
  relacao: string;
  peso?: number;
}

// A graph node row resolved by referenciaId.
export interface GraphNodeRef {
  id: string;
  referenciaId: string;
  tipoNode: string;
}

export interface PlannedEdge {
  nodeOrigemId: string;
  nodeDestinoId: string;
  relacao: string;
  peso: number;
}

export interface BaralhoFlashcards {
  baralhoRef: string;
  fcRefs: string[];
}

export interface ProvaQuestoes {
  provaRef: string;
  questaoRefs: string[];
}

// Edge weight is clamped to (0, 2]; anything else falls back to 1.
export function clampPeso(peso?: number): number {
  return peso !== undefined && Number.isFinite(peso) && peso > 0 && peso <= 2 ? peso : 1;
}

// Node link ids whose entity is no longer present in the vault (to unlink).
export function refsToRemove(
  current: ReadonlyArray<{ id: string; referenciaId: string }>,
  vaultRefs: ReadonlySet<string>,
): string[] {
  return current.filter((c) => !vaultRefs.has(c.referenciaId)).map((c) => c.id);
}

// Edges to (re)create: both endpoints must exist, no self-loop, the relation must
// be allowed; duplicates (same source/target/relation) are dropped.
export function planVaultEdges(
  edges: VaultEdge[],
  byRef: Map<string, GraphNodeRef>,
): PlannedEdge[] {
  const planned: PlannedEdge[] = [];
  const seen = new Set<string>();
  for (const e of edges) {
    const endpoints = resolveEndpoints(e, byRef);
    if (!endpoints) continue;
    const key = `${endpoints.s.id}->${endpoints.t.id}->${e.relacao}`;
    if (seen.has(key)) continue;
    seen.add(key);
    planned.push(plannedEdge(endpoints, e));
  }
  return planned;
}

function plannedEdge(endpoints: { s: GraphNodeRef; t: GraphNodeRef }, e: VaultEdge): PlannedEdge {
  return {
    nodeOrigemId: endpoints.s.id,
    nodeDestinoId: endpoints.t.id,
    relacao: e.relacao,
    peso: clampPeso(e.peso),
  };
}

function resolveEndpoints(
  e: VaultEdge,
  byRef: Map<string, GraphNodeRef>,
): { s: GraphNodeRef; t: GraphNodeRef } | null {
  const s = byRef.get(e.origem);
  const t = byRef.get(e.destino);
  if (!s || !t || s.id === t.id) return null;
  if (!isRelationAllowed(s.tipoNode, t.tipoNode, e.relacao)) return null;
  return { s, t };
}

// CONTEM edges from a container type to an item type, grouped by container.
// Both containment pairs in the graph (deck→card, exam→question) mirror a join
// table the study/exam services read, so the grouping is the same shape twice.
function containmentPairs(
  edges: VaultEdge[],
  byRef: Map<string, GraphNodeRef>,
  container: string,
  item: string,
): Array<{ containerRef: string; itemRefs: string[] }> {
  const byContainer = new Map<string, string[]>();
  for (const e of edges) {
    if (!isContains(e, byRef, container, item)) continue;
    byContainer.set(e.origem, [...(byContainer.get(e.origem) ?? []), e.destino]);
  }
  return [...byContainer.entries()].map(([containerRef, itemRefs]) => ({ containerRef, itemRefs }));
}

function isContains(
  e: VaultEdge,
  byRef: Map<string, GraphNodeRef>,
  container: string,
  item: string,
): boolean {
  if (e.relacao !== 'CONTEM') return false;
  return byRef.get(e.origem)?.tipoNode === container && byRef.get(e.destino)?.tipoNode === item;
}

// BARALHO→FLASHCARD CONTEM edges, grouped by deck — kept in sync with the
// baralho_flashcards relation the study service reads.
export function baralhoFlashcardPairs(
  edges: VaultEdge[],
  byRef: Map<string, GraphNodeRef>,
): BaralhoFlashcards[] {
  return containmentPairs(edges, byRef, 'BARALHO', 'FLASHCARD').map((p) => ({
    baralhoRef: p.containerRef,
    fcRefs: p.itemRefs,
  }));
}

/**
 * Order of the questions inside an exam, for the provas_questoes join table.
 *
 * The vault does NOT carry the order — a .md has no slot for it — so questions
 * already in the exam keep the order they had and new ones are appended. Without
 * this the order would be reshuffled on every Push, following whatever sequence
 * the folder happened to be read in.
 * @example planProvaQuestoes(['q2', 'q9'], [{ questaoId: 'q2', ordem: 4 }])
 */
export function planProvaQuestoes(
  questaoRefs: string[],
  current: ReadonlyArray<{ questaoId: string; ordem: number }>,
): Array<{ questaoId: string; ordem: number }> {
  const known = new Map(current.map((q) => [q.questaoId, q.ordem]));
  let next = current.reduce((max, q) => Math.max(max, q.ordem), -1) + 1;
  return questaoRefs.map((questaoId) => ({
    questaoId,
    ordem: known.get(questaoId) ?? next++,
  }));
}

// PROVA→QUESTION CONTEM edges, grouped by exam — mirror of the deck pairing, for
// the provas_questoes join table (which also carries the question's order).
export function provaQuestaoPairs(
  edges: VaultEdge[],
  byRef: Map<string, GraphNodeRef>,
): ProvaQuestoes[] {
  return containmentPairs(edges, byRef, 'PROVA', 'QUESTION').map((p) => ({
    provaRef: p.containerRef,
    questaoRefs: p.itemRefs,
  }));
}
