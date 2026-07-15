import type { BaralhoCardOption } from "../baralho.types";

/**
 * Filtra os flashcards candidatos pela busca (pergunta ou conceito), sem
 * diferenciar maiúsculas.
 * @example filterCardOptions(options, "fotossin")
 */
export function filterCardOptions(
  options: BaralhoCardOption[],
  search: string,
): BaralhoCardOption[] {
  const term = search.trim().toLowerCase();
  if (!term) return options;
  return options.filter(
    (option) =>
      option.pergunta.toLowerCase().includes(term) ||
      option.conceito.toLowerCase().includes(term),
  );
}

/** Remove das opções os cartões que já estão no baralho. */
export function excludeCardsInDeck(
  options: BaralhoCardOption[],
  deckCardIds: string[],
): BaralhoCardOption[] {
  const inDeck = new Set(deckCardIds);
  return options.filter((option) => !inDeck.has(option.id));
}
