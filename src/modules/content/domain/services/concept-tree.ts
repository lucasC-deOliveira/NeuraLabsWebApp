// Pure derivations over the concept hierarchy tree used by the manual editor.
import type {
  ConceitoArvore,
  TopicoEntry,
  FlatConcept,
  ConceptContext,
} from "../concept-tree.types";

export interface FlattenedTree {
  flat: FlatConcept[];
  conceptMap: Map<string, ConceptContext>;
}

interface ConceptTriple {
  ass: ConceitoArvore;
  top: TopicoEntry;
  concId: string;
  concNome: string;
}

// The tree is 5 levels deep (assunto → relAT → topico → relTC → conceito). We
// flatten it with per-level helpers to keep each function within the depth and
// nested-callback limits, then a single pass builds the outputs.

function topicosOf(ass: ConceitoArvore): TopicoEntry[] {
  return ass.relAssuntoTopico.flatMap((rel) => rel.topicos);
}

function conceptTuplesOf(top: TopicoEntry): Array<{ id: string; nome: string }> {
  return top.relacoesTopicoConceito.flatMap((rel) => rel.conceitos);
}

function triplesOf(ass: ConceitoArvore): ConceptTriple[] {
  return topicosOf(ass).flatMap((top) =>
    conceptTuplesOf(top).map((c) => ({ ass, top, concId: c.id, concNome: c.nome })),
  );
}

function allTriples(tree: ConceitoArvore[]): ConceptTriple[] {
  return tree.flatMap(triplesOf);
}

/**
 * Produces a flat, name-sorted concept list and a context lookup. Pure (no I/O).
 */
export function flattenConceptTree(tree: ConceitoArvore[]): FlattenedTree {
  const conceptMap = new Map<string, ConceptContext>();
  const flat: FlatConcept[] = allTriples(tree).map((t) => {
    conceptMap.set(t.concId, { nome: t.concNome, topicoNome: t.top.nome, assuntoNome: t.ass.nome });
    return { id: t.concId, nome: t.concNome, topicoNome: t.top.nome, topicoId: t.top.id, assuntoNome: t.ass.nome, assuntoId: t.ass.id };
  });
  flat.sort((a, b) => a.nome.localeCompare(b.nome));
  return { flat, conceptMap };
}

/** Deduplicated topicos under one assunto. */
export function getTopicosForAssunto(tree: ConceitoArvore[], assuntoId: string): Array<{ id: string; nome: string }> {
  const ass = tree.find((a) => a.id === assuntoId);
  if (!ass) return [];
  const seen = new Map<string, string>();
  for (const tp of topicosOf(ass)) {
    if (!seen.has(tp.id)) seen.set(tp.id, tp.nome);
  }
  return Array.from(seen.entries()).map(([id, nome]) => ({ id, nome }));
}

/** Filters the flat concept list by name/topic/subject substring. */
export function filterFlatConcepts(flat: FlatConcept[], search: string): FlatConcept[] {
  if (!search) return flat;
  const l = search.toLowerCase();
  return flat.filter(
    (c) =>
      c.nome.toLowerCase().includes(l) ||
      c.topicoNome.toLowerCase().includes(l) ||
      c.assuntoNome.toLowerCase().includes(l),
  );
}

/** How many concepts under a topico are currently selected. */
export function countSelectedInTopico(top: TopicoEntry, selected: Set<string>): number {
  return conceptTuplesOf(top).filter((c) => selected.has(c.id)).length;
}

/** How many concepts under an assunto are currently selected. */
export function countSelectedInAssunto(ass: ConceitoArvore, selected: Set<string>): number {
  return topicosOf(ass).reduce((sum, top) => sum + countSelectedInTopico(top, selected), 0);
}

/** Resolves a topic name from the tree by id (empty string when unknown). */
export function findTopicName(tree: ConceitoArvore[], topicoId: string): string {
  const found = tree
    .flatMap((a) => a.relAssuntoTopico)
    .flatMap((rel) => rel.topicos)
    .find((t) => t.id === topicoId);
  return found?.nome ?? "";
}
