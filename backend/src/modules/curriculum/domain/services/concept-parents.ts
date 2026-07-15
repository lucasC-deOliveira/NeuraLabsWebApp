// Pais de um conceito (tópico e assunto) derivados do GRAFO: a hierarquia real vive
// nas arestas PERTENCE_A (CONCEITO → TOPICO → ASSUNTO), não nas chaves estrangeiras
// de Conceito.topicoId / Topico.assuntoId, que na prática ficam nulas.
// Lógica pura: o adapter consulta as arestas e passa os mapas prontos.

export interface NamedEntity {
  id: string;
  nome: string;
}

export interface ConceptParents {
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
}

export const NO_PARENTS: ConceptParents = { topico: '', topicoId: '', assunto: '', assuntoId: '' };

export interface ParentMaps {
  // nó do conceito → nó do tópico (aresta PERTENCE_A)
  topicoNodeByConceptNode: Map<string, string>;
  // nó do tópico → nó do assunto (aresta PERTENCE_A)
  assuntoNodeByTopicoNode: Map<string, string>;
  topicoByNode: Map<string, NamedEntity>;
  assuntoByNode: Map<string, NamedEntity>;
}

/**
 * Sobe a hierarquia a partir do nó de um conceito. Um conceito sem aresta para
 * tópico não tem pais; um tópico sem aresta para assunto tem tópico e assunto vazio.
 * @example resolveParents('nConceito', maps) // { topico: 'Cache', topicoId: 't1', ... }
 */
export function resolveParents(conceptNode: string, maps: ParentMaps): ConceptParents {
  const topicoNode = maps.topicoNodeByConceptNode.get(conceptNode);
  if (!topicoNode) return NO_PARENTS;
  const topico = maps.topicoByNode.get(topicoNode);
  if (!topico) return NO_PARENTS;
  const assuntoNode = maps.assuntoNodeByTopicoNode.get(topicoNode);
  const assunto = assuntoNode ? maps.assuntoByNode.get(assuntoNode) : undefined;
  return {
    topico: topico.nome,
    topicoId: topico.id,
    assunto: assunto?.nome ?? '',
    assuntoId: assunto?.id ?? '',
  };
}

/**
 * Pais por conceito. O mesmo conceito pode ter nó em vários grafos: vence o primeiro
 * nó que tiver pais, para um nó solto não apagar a hierarquia achada em outro.
 * @example parentsByConceito(new Map([['nA', 'c1']]), maps) // Map { c1 => { ... } }
 */
export function parentsByConceito(
  conceptNodeToId: Map<string, string>,
  maps: ParentMaps,
): Map<string, ConceptParents> {
  const out = new Map<string, ConceptParents>();
  for (const [node, conceitoId] of conceptNodeToId) {
    const parents = resolveParents(node, maps);
    if (parents.topicoId || !out.has(conceitoId)) out.set(conceitoId, parents);
  }
  return out;
}
