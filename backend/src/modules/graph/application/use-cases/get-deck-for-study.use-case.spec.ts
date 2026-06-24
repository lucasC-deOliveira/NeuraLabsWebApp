import { describe, it, expect } from 'vitest';
import { GetDeckForStudyUseCase } from './get-deck-for-study.use-case';
import type { DeckCards, DeckQuery, FlashcardPickerItem } from '../../domain/ports/deck-query';

class FakeDeckQuery implements DeckQuery {
  constructor(private readonly deck: DeckCards | null) {}
  async listUserFlashcards(): Promise<FlashcardPickerItem[]> {
    return [];
  }
  async findDeckForStudy(): Promise<DeckCards | null> {
    return this.deck;
  }
}

describe('GetDeckForStudyUseCase', () => {
  it('returns the deck cards when owned', async () => {
    const deck: DeckCards = {
      titulo: 'Bio',
      cards: [{ id: 'f1', pergunta: 'Q', resposta: 'A', conceito: null }],
    };
    const useCase = new GetDeckForStudyUseCase(new FakeDeckQuery(deck));
    expect(await useCase.execute('u1', 'b1')).toEqual(deck);
  });

  it('returns null when the deck is not found', async () => {
    const useCase = new GetDeckForStudyUseCase(new FakeDeckQuery(null));
    expect(await useCase.execute('u1', 'missing')).toBeNull();
  });
});
