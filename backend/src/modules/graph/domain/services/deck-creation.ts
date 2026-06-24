import { DeckTitleRequiredError, TooManyFlashcardsError } from '../errors';

export const MAX_DECK_FLASHCARDS = 1000;

// Normalizes a deck-creation request: trims the title and de-duplicates the
// flashcard ids, enforcing the invariants (title required, size cap). Ownership
// of the flashcards is checked separately (it needs I/O).
export function normalizeDeckCreation(
  titulo: string,
  flashcardIds: string[],
): { titulo: string; flashcardIds: string[] } {
  const trimmed = (titulo ?? '').trim();
  if (!trimmed) throw new DeckTitleRequiredError();
  const ids = Array.from(new Set(flashcardIds ?? []));
  if (ids.length > MAX_DECK_FLASHCARDS) throw new TooManyFlashcardsError(MAX_DECK_FLASHCARDS);
  return { titulo: trimmed, flashcardIds: ids };
}
