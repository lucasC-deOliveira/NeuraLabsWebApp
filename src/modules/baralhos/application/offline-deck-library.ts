import type { BaralhoDetail } from "../domain/baralho.types";

export interface OfflineDeckStore {
  save(scope: string, deck: BaralhoDetail): Promise<void>;
  list(scope: string): Promise<BaralhoDetail[]>;
}

/** Persists a complete server snapshot for the account that requested it.
 * @example await downloadOfflineDeck(store, () => decks.getBaralho(id), getScope)
 */
export async function downloadOfflineDeck(
  store: OfflineDeckStore,
  fetchDeck: () => Promise<BaralhoDetail>,
  getScope: () => string | null,
): Promise<void> {
  const scope = getScope();
  if (!scope) throw new Error("Missing offline scope. Expected: a verified account and server");
  const deck = await fetchDeck();
  const currentScope = getScope();
  if (currentScope !== scope) throw new Error(`Offline scope changed to "${currentScope}". Expected: "${scope}"`);
  const incomplete = deck.cards.find((card) => card.schedule === undefined);
  if (incomplete) throw new Error(`Missing schedule for "${incomplete.id}". Expected: schedule or null`);
  await store.save(scope, deck);
}
