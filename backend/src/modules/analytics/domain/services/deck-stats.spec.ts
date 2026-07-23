import { describe, it, expect } from 'vitest';
import { deckStats } from './deck-stats';
import type { CardReviewStat, DeckCardRow } from '../ports/deck-analytics-source';

const now = new Date('2026-07-22T12:00:00Z');
const card = (over: Partial<DeckCardRow>): DeckCardRow => ({
  baralhoId: 'b1',
  titulo: 'Baralho 1',
  flashcardId: 'f1',
  fase: 'REVIEW',
  intervalo: 30,
  proximaRevisao: new Date('2026-08-01T00:00:00Z'),
  ...over,
});

describe('deckStats', () => {
  it('aggregates cards, maturity, due and accuracy per deck', () => {
    const cards = [
      card({ flashcardId: 'f1', fase: 'REVIEW', intervalo: 30 }), // madura, não devida
      card({ flashcardId: 'f2', fase: 'LEARN', intervalo: 0, proximaRevisao: null }), // devida (nova)
    ];
    const reviews: CardReviewStat[] = [{ flashcardId: 'f1', total: 4, correct: 3 }];
    const [deck] = deckStats(cards, reviews, now);
    expect(deck).toEqual({
      baralhoId: 'b1',
      titulo: 'Baralho 1',
      cards: 2,
      mature: 1,
      due: 1,
      reviewed: 1,
      accuracy: 75,
    });
  });

  it('counts overdue cards as due', () => {
    const [deck] = deckStats([card({ proximaRevisao: new Date('2026-07-01T00:00:00Z') })], [], now);
    expect(deck.due).toBe(1);
  });

  it('reports null accuracy when a deck was never reviewed', () => {
    const [deck] = deckStats([card({})], [], now);
    expect(deck.accuracy).toBeNull();
  });

  it('orders decks by card count (largest first)', () => {
    const cards = [
      card({ baralhoId: 'b1', titulo: 'B1', flashcardId: 'a' }),
      card({ baralhoId: 'b2', titulo: 'B2', flashcardId: 'b' }),
      card({ baralhoId: 'b2', titulo: 'B2', flashcardId: 'c' }),
    ];
    expect(deckStats(cards, [], now).map((d) => d.baralhoId)).toEqual(['b2', 'b1']);
  });
});
