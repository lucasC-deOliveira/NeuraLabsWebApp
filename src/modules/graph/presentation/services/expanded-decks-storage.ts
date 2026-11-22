type DeckPreferenceStorage = Pick<Storage, "getItem" | "setItem">;

function expandedDecksKey(graphId: string): string {
  return `neuralabs.expanded-decks.v1:${encodeURIComponent(graphId)}`;
}

/** Reads per-graph exceptions to the collapsed default.
 * @example loadExpandedDecks("graph-1")
 */
export function loadExpandedDecks(graphId: string, storage?: DeckPreferenceStorage): Set<string> {
  try {
    const raw = (storage ?? localStorage).getItem(expandedDecksKey(graphId));
    const values: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(values) ? values.filter((id): id is string => typeof id === "string" && !!id) : []);
  } catch {
    return new Set();
  }
}

/** Saves the decks the user opened in this graph on the current device.
 * @example saveExpandedDecks("graph-1", new Set(["deck-1"]))
 */
export function saveExpandedDecks(graphId: string, deckIds: ReadonlySet<string>, storage?: DeckPreferenceStorage): void {
  try {
    (storage ?? localStorage).setItem(expandedDecksKey(graphId), JSON.stringify([...deckIds]));
  } catch {
    // A storage failure must not prevent a deck from opening in this session.
  }
}
