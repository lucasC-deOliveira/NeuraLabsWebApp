import type { DeckQuery, FlashcardPickerItem } from '../../domain/ports/deck-query';

/**
 * Lists the user's flashcards (newest first) for the deck-builder picker.
 * @example listUserFlashcards.execute('u1') // → FlashcardPickerItem[]
 */
export class ListUserFlashcardsUseCase {
  constructor(private readonly decks: DeckQuery) {}

  execute(userId: string): Promise<FlashcardPickerItem[]> {
    return this.decks.listUserFlashcards(userId);
  }
}
