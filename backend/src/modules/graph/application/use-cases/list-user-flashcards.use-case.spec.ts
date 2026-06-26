import { describe, it, expect } from 'vitest';
import { ListUserFlashcardsUseCase } from './list-user-flashcards.use-case';
import type { DeckCards, DeckQuery, FlashcardPickerItem } from '../../domain/ports/deck-query';

class FakeDeckQuery implements DeckQuery {
  constructor(private readonly items: FlashcardPickerItem[]) {}
  async listUserFlashcards(): Promise<FlashcardPickerItem[]> {
    return this.items;
  }
  async findDeckForStudy(): Promise<DeckCards | null> {
    return null;
  }
}

describe('ListUserFlashcardsUseCase', () => {
  it('returns the user flashcards from the query', async () => {
    const items = [{ id: 'f1', pergunta: 'Q', conceito: 'C' }];
    const useCase = new ListUserFlashcardsUseCase(new FakeDeckQuery(items));
    expect(await useCase.execute('u1')).toEqual(items);
  });
});
