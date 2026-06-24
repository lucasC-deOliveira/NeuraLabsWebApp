import { isRelationAllowed } from './relation-rules';

// Vault payload (desktop Push): nodes + edges keyed by referenciaId (ref).
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
  posicaoX?: number | null;
  posicaoY?: number | null;
  nivelDominio?: number;
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

// BARALHO→FLASHCARD CONTEM edges, grouped by deck — kept in sync with the
// baralho_flashcards relation the study service reads.
export function baralhoFlashcardPairs(
  edges: VaultEdge[],
  byRef: Map<string, GraphNodeRef>,
): BaralhoFlashcards[] {
  const byDeck = new Map<string, string[]>();
  for (const e of edges) {
    if (!isDeckContains(e, byRef)) continue;
    byDeck.set(e.origem, [...(byDeck.get(e.origem) ?? []), e.destino]);
  }
  return [...byDeck.entries()].map(([baralhoRef, fcRefs]) => ({ baralhoRef, fcRefs }));
}

function isDeckContains(e: VaultEdge, byRef: Map<string, GraphNodeRef>): boolean {
  if (e.relacao !== 'CONTEM') return false;
  const s = byRef.get(e.origem);
  const t = byRef.get(e.destino);
  return s?.tipoNode === 'BARALHO' && t?.tipoNode === 'FLASHCARD';
}
