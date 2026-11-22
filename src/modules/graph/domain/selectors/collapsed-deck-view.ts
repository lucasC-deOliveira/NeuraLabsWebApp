interface DeckViewNode {
  id: string;
  group: string;
  x: number;
  y: number;
}

interface DeckViewEdge {
  source: string;
  target: string;
  type: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

type DeckMembershipEdge = Pick<DeckViewEdge, "source" | "target" | "type">;

/** Identifies decks with graph-member flashcards, excluding unrelated containment edges.
 * @example graphDeckIds(rawNodes, rawEdges)
 */
export function graphDeckIds(nodes: readonly { id: string; type: string }[], edges: readonly DeckMembershipEdge[]): Set<string> {
  const types = new Map(nodes.map(({ id, type }) => [id, type]));
  return new Set(edges.filter(({ source, target, type }) =>
    type === "CONTEM" && types.get(source) === "BARALHO" && types.get(target) === "FLASHCARD").map(({ source }) => source));
}

function deckMembership(nodes: Map<string, DeckViewNode>, membership: readonly DeckMembershipEdge[]): Map<string, Set<string>> {
  const decksByCard = new Map<string, Set<string>>();
  for (const { source, target, type } of membership) {
    if (type !== "CONTEM" || nodes.get(source)?.group !== "BARALHO" || nodes.get(target)?.group !== "FLASHCARD") continue;
    const decks = decksByCard.get(target) ?? new Set();
    decks.add(source);
    decksByCard.set(target, decks);
  }
  return decksByCard;
}

function aggregateConceptEdge<E extends DeckViewEdge>(
  edge: E, nodes: Map<string, DeckViewNode>, decksByCard: Map<string, Set<string>>, closed: ReadonlySet<string>,
): E[] {
  const sourceType = nodes.get(edge.source)?.group;
  const targetType = nodes.get(edge.target)?.group;
  const fromCard = sourceType === "FLASHCARD" && targetType === "CONCEITO";
  if (!fromCard && !(sourceType === "CONCEITO" && targetType === "FLASHCARD")) return [];
  const card = fromCard ? edge.source : edge.target;
  const decks = decksByCard.get(card) ?? [];
  return [...decks].filter((deck) => closed.has(deck)).map((deckId) => {
    const deck = nodes.get(deckId)!;
    return fromCard
      ? { ...edge, source: deck.id, sourceX: deck.x, sourceY: deck.y }
      : { ...edge, target: deck.id, targetX: deck.x, targetY: deck.y };
  });
}

function visibleDeckEdges<E extends DeckViewEdge>(edges: E[], hidden: Set<string>, closed: ReadonlySet<string>,
  nodes: Map<string, DeckViewNode>, decksByCard: Map<string, Set<string>>): E[] {
  const visible = edges.filter(({ source, target, type }) =>
    nodes.has(source) && nodes.has(target) && !hidden.has(source) && !hidden.has(target) &&
    !(type === "CONTEM" && closed.has(source) && decksByCard.has(target)));
  const keys = new Set(visible.map(({ source, type, target }) => JSON.stringify([source, type, target])));
  for (const edge of edges) {
    collectDeckEdges(visible, keys, aggregateConceptEdge(edge, nodes, decksByCard, closed));
  }
  return visible;
}

function collectDeckEdges<E extends DeckViewEdge>(edges: E[], keys: Set<string>, projected: E[]): void {
  for (const edge of projected) {
    const key = JSON.stringify([edge.source, edge.type, edge.target]);
    if (keys.has(key)) continue;
    keys.add(key);
    edges.push(edge);
  }
}

/** Projects deck links without changing graph membership or the original relations.
 * @example projectCollapsedDecks(nodes, edges, memberships, new Set(["deck-1"]))
 */
export function projectCollapsedDecks<N extends DeckViewNode, E extends DeckViewEdge>(
  nodes: N[], edges: E[], membership: readonly DeckMembershipEdge[], collapsed: ReadonlySet<string>,
): { nodes: N[]; edges: E[] } {
  if (!collapsed.size) return { nodes, edges };
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const decksByCard = deckMembership(byId, membership);
  if (!decksByCard.size) return { nodes, edges };
  const hidden = new Set([...decksByCard].filter(([, owners]) =>
    [...owners].every((deck) => collapsed.has(deck))).map(([card]) => card));
  return {
    nodes: nodes.filter(({ id }) => !hidden.has(id)),
    edges: visibleDeckEdges(edges, hidden, collapsed, byId, decksByCard),
  };
}
