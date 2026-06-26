import { describe, it, expect } from 'vitest';
import { normalizeDeckCreation, MAX_DECK_FLASHCARDS } from './deck-creation';
import { DeckTitleRequiredError, TooManyFlashcardsError } from '../errors';

describe('normalizeDeckCreation', () => {
  it('trims the title and de-duplicates ids', () => {
    expect(normalizeDeckCreation('  Bio  ', ['a', 'a', 'b'])).toEqual({
      titulo: 'Bio',
      flashcardIds: ['a', 'b'],
    });
  });

  it('requires a non-blank title', () => {
    expect(() => normalizeDeckCreation('   ', [])).toThrow(DeckTitleRequiredError);
  });

  it('rejects more than the maximum number of flashcards', () => {
    const ids = Array.from({ length: MAX_DECK_FLASHCARDS + 1 }, (_, i) => `c${i}`);
    expect(() => normalizeDeckCreation('Bio', ids)).toThrow(TooManyFlashcardsError);
  });

  it('accepts exactly the maximum number of flashcards', () => {
    const ids = Array.from({ length: MAX_DECK_FLASHCARDS }, (_, i) => `c${i}`);
    expect(normalizeDeckCreation('Bio', ids).flashcardIds).toHaveLength(MAX_DECK_FLASHCARDS);
  });
});
