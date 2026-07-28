// Seleção de cards novos na ordem do roadmap. Puro: a fonte já entrega os conceitos
// ordenados (trilha) com seus cards novos; aqui só percorre até o limite, preservando
// a ordem — assim o que o roadmap prioriza é o que você aprende primeiro.

export interface ConceptNewCards {
  conceitoId: string;
  cardIds: string[]; // cards novos (sem aprendizado) deste conceito
}

/**
 * Puxa cards novos conceito a conceito, na ordem do roadmap, até `limit`.
 * @example pickNewCards([{ conceitoId: 'c1', cardIds: ['a', 'b'] }], 1) // ['a']
 */
export function pickNewCards(ordered: ConceptNewCards[], limit: number): string[] {
  return ordered.flatMap((concept) => concept.cardIds).slice(0, Math.max(0, limit));
}

// Uma ligação card↔conceito vinda do grafo (aresta FLASHCARD→CONCEITO já resolvida
// no nó do conceito). O adapter monta a lista; aqui a lógica de agrupar é pura.
export interface ConceptLink {
  conceptNodeId: string;
  flashcardId: string;
}

/**
 * Agrupa os cards NOVOS por conceito, na ordem do roadmap. Só entram cards em `isNew`;
 * conceitos sem card novo somem. Sem duplicar card (um card pode ligar ao mesmo conceito
 * por mais de uma aresta).
 * @example groupNewByConcept(['c1'], new Map([['n1','c1']]), [{conceptNodeId:'n1',flashcardId:'a'}], new Set(['a']))
 */
export function groupNewByConcept(
  conceitoOrder: string[],
  conceptNodeToId: Map<string, string>,
  links: ConceptLink[],
  isNew: Set<string>,
): ConceptNewCards[] {
  const byConceito = new Map<string, string[]>();
  for (const link of links) {
    const conceitoId = conceptNodeToId.get(link.conceptNodeId);
    if (!conceitoId || !isNew.has(link.flashcardId)) continue;
    const bucket = byConceito.get(conceitoId) ?? [];
    if (!bucket.includes(link.flashcardId)) bucket.push(link.flashcardId);
    byConceito.set(conceitoId, bucket);
  }
  return conceitoOrder.flatMap((conceitoId) => {
    const cardIds = byConceito.get(conceitoId);
    return cardIds && cardIds.length > 0 ? [{ conceitoId, cardIds }] : [];
  });
}
