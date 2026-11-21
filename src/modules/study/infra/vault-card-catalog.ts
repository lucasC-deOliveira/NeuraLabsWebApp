import type { VaultCard, VaultLibrary } from "../domain/vault-library";

/** Lists cards across both the standalone catalog and older deck snapshots.
 * @example const cards = catalogVaultCards(library)
 */
export function catalogVaultCards(library: VaultLibrary): VaultCard[] {
  const entries = [...library.decks.flatMap((deck) => deck.cards), ...(library.cards ?? [])];
  return [...new Map(entries.map((card) => [card.id, card])).values()];
}

/** Updates all references to a card, or removes it from every deck.
 * @example const next = transformVaultCards(library, (card) => card.id === id ? null : card)
 */
export function transformVaultCards(
  library: VaultLibrary,
  transform: (card: VaultCard) => VaultCard | null,
): VaultLibrary {
  const transformList = (cards: VaultCard[]): VaultCard[] =>
    cards.map(transform).filter((card): card is VaultCard => card !== null);
  return {
    ...library,
    cards: transformList(library.cards ?? []),
    decks: library.decks.map((deck) => ({ ...deck, cards: transformList(deck.cards) })),
  };
}
