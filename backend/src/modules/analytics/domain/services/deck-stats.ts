import type { CardReviewStat, DeckCardRow } from '../ports/deck-analytics-source';
import type { DeckStat } from '../deck-analytics-views';

const MATURE_INTERVAL_DAYS = 21;

interface DeckAcc {
  baralhoId: string;
  titulo: string;
  cards: number;
  mature: number;
  due: number;
  reviewed: number;
  correct: number;
  total: number;
}

function isMature(card: DeckCardRow): boolean {
  if (card.fase === null || card.fase === 'LEARN' || card.fase === 'RELEARN') return false;
  return (card.intervalo ?? 0) >= MATURE_INTERVAL_DAYS;
}

// Nova (sem estado) ou vencida (proximaRevisao <= agora).
function isDue(card: DeckCardRow, now: Date): boolean {
  return card.proximaRevisao === null || card.proximaRevisao <= now;
}

function emptyDeck(card: DeckCardRow): DeckAcc {
  return {
    baralhoId: card.baralhoId,
    titulo: card.titulo,
    cards: 0,
    mature: 0,
    due: 0,
    reviewed: 0,
    correct: 0,
    total: 0,
  };
}

// Estatísticas por baralho (acurácia, maturidade, devidas), do maior para o menor.
export function deckStats(cards: DeckCardRow[], reviews: CardReviewStat[], now: Date): DeckStat[] {
  const stats = new Map(reviews.map((r) => [r.flashcardId, r]));
  const byDeck = new Map<string, DeckAcc>();
  for (const card of cards) {
    const deck = byDeck.get(card.baralhoId) ?? emptyDeck(card);
    deck.cards++;
    if (isMature(card)) deck.mature++;
    if (isDue(card, now)) deck.due++;
    const rs = stats.get(card.flashcardId);
    if (rs && rs.total > 0) {
      deck.reviewed++;
      deck.total += rs.total;
      deck.correct += rs.correct;
    }
    byDeck.set(card.baralhoId, deck);
  }
  return [...byDeck.values()].map(finalize).sort((a, b) => b.cards - a.cards);
}

function finalize(deck: DeckAcc): DeckStat {
  return {
    baralhoId: deck.baralhoId,
    titulo: deck.titulo,
    cards: deck.cards,
    mature: deck.mature,
    due: deck.due,
    reviewed: deck.reviewed,
    accuracy: deck.total > 0 ? Math.round((deck.correct / deck.total) * 100) : null,
  };
}
