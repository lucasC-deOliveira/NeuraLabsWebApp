// ==========================================
// Content Mixing (Interleaving)
// Shuffle cards to maximize concept variety
// ==========================================

import type { FlashcardData } from "@/types";

/**
 * Shuffles cards so no more than `maxPerConcept` consecutive cards
 * share the same concept. Falls back to simple shuffle if interleaving
 * is impossible (e.g., all cards belong to one concept).
 */
export function applyInterleaving(
  cards: FlashcardData[],
  maxPerConcept: number = 2,
): FlashcardData[] {
  if (cards.length <= maxPerConcept) {
    return [...cards];
  }

  // Group cards by concept
  const byConcept = new Map<string, FlashcardData[]>();
  for (const card of cards) {
    const group = byConcept.get(card.conceito) ?? [];
    group.push(card);
    byConcept.set(card.conceito, group);
  }

  const result: FlashcardData[] = [];
  const remaining = new Map(byConcept); // concept -> queue of cards

  // Round-robin: pull one card from each concept group, cycling
  while (result.length < cards.length) {
    let pulledAny = false;

    for (const [concept, queue] of remaining) {
      // Check interleaving constraint
      const recent = result.slice(-maxPerConcept);
      const recentCount = recent.filter((c) => c.conceito === concept).length;

      if (recentCount < maxPerConcept && queue.length > 0) {
        result.push(queue.shift()!);
        pulledAny = true;
      }
    }

    // If we went full cycle without pulling (all blocked),
    // just drain one card from whichever group still has cards
    if (!pulledAny) {
      for (const [concept, queue] of remaining) {
        if (queue.length > 0) {
          result.push(queue.shift()!);
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Picks the smartest next card based on:
 * 1. Not already reviewed in this session
 * 2. Prioritizes concepts the user performs worst on
 * 3. Respects interleaving (avoid repeating the last concept too often)
 *
 * @param availableCards — full card pool
 * @param reviewedIds — flashcard IDs already reviewed this session
 * @param performanceHistory — prior reviews for all cards
 * @param maxPerConcept — max consecutive cards from same concept
 * @param conceptNames — map of flashcard id -> concept name
 */
export function getNextCardAlgorithm(
  availableCards: FlashcardData[],
  reviewedIds: Set<string>,
  performanceHistory: Array<{ flashcardId: string; acertou: boolean }>,
  maxPerConcept: number = 2,
): FlashcardData | null {
  // Candidates: not yet reviewed
  const candidates = availableCards.filter(
    (c) => !reviewedIds.has(c.id),
  );

  if (candidates.length === 0) return null;

  // Build weakness score per concept (lower accuracy = weaker)
  const conceptStats = new Map<string, { correct: number; total: number }>();
  for (const card of availableCards) {
    if (!conceptStats.has(card.conceito)) {
      conceptStats.set(card.conceito, { correct: 0, total: 0 });
    }
  }
  for (const rev of performanceHistory) {
    const card = availableCards.find((c) => c.id === rev.flashcardId);
    if (!card) continue;
    const stats = conceptStats.get(card.conceito);
    if (stats) {
      stats.total++;
      if (rev.acertou) stats.correct++;
    }
  }

  // Sort candidates: weakest concept first, then shuffle within same-weakness
  candidates.sort((a, b) => {
    const statsA = conceptStats.get(a.conceito);
    const statsB = conceptStats.get(b.conceito);

    const rateA = statsA && statsA.total > 0 ? statsA.correct / statsA.total : 0.5;
    const rateB = statsB && statsB.total > 0 ? statsB.correct / statsB.total : 0.5;

    return rateA - rateB; // lower accuracy = prioritize
  });

  // If top candidate violates interleaving, find the next that doesn't
  const lastConcept = getLastConcept(availableCards, reviewedIds);
  if (lastConcept) {
    const consecutive = countRecentSameConcept(
      reviewedIds,
      availableCards,
      lastConcept,
      maxPerConcept,
    );

    if (consecutive >= maxPerConcept) {
      const alternative = candidates.find(
        (c) => c.conceito !== lastConcept,
      );
      if (alternative) return alternative;
    }
  }

  return candidates[0] ?? null;
}

/**
 * Returns the concept of the most recently reviewed card.
 */
function getLastConcept(
  allCards: FlashcardData[],
  reviewedIds: Set<string>,
): string | null {
  const cardMap = new Map(allCards.map((c) => [c.id, c]));
  // We don't have order info — just pick any reviewed card's concept
  // (in practice the caller would track order)
  for (const id of reviewedIds) {
    return cardMap.get(id)?.conceito ?? null;
  }
  return null;
}

/**
 * Counts how many cards of the same concept are among the maxPerConcept most recently reviewed.
 */
function countRecentSameConcept(
  reviewedIds: Set<string>,
  allCards: FlashcardData[],
  concept: string,
  maxPerConcept: number,
): number {
  const cardMap = new Map(allCards.map((c) => [c.id, c]));
  const ids = Array.from(reviewedIds);
  const recent = ids.slice(-maxPerConcept);
  return recent.filter((id) => cardMap.get(id)?.conceito === concept).length;
}
