import { describe, it, expect } from 'vitest';
import { applyInterleaving } from './interleaving';

// Characterization of card interleaving by concept.
type Card = { id: number; conceito: string | null };
const card = (id: number, conceito: string | null): Card => ({ id, conceito });

// Longest run of consecutive cards from the same concept in the result.
function maxRun(cards: Card[]): number {
  let max = 0;
  let run = 0;
  let prev: string | null | undefined;
  for (const c of cards) {
    const k = c.conceito ?? '';
    run = k === prev ? run + 1 : 1;
    prev = k;
    if (run > max) max = run;
  }
  return max;
}

describe('applyInterleaving', () => {
  it('returns a copy when there are <= maxPerConcept cards', () => {
    const input = [card(1, 'A'), card(2, 'A')];
    const out = applyInterleaving(input, 2);
    expect(out).toEqual(input);
    expect(out).not.toBe(input); // a copy, not the same reference
  });

  it('preserves all cards (same count per concept)', () => {
    const input = [
      card(1, 'A'),
      card(2, 'A'),
      card(3, 'A'),
      card(4, 'A'),
      card(5, 'B'),
      card(6, 'B'),
      card(7, null),
    ];
    const out = applyInterleaving(input, 2);
    expect(out).toHaveLength(input.length);
    expect(new Set(out.map((c) => c.id))).toEqual(new Set(input.map((c) => c.id)));
  });

  it('never leaves more than maxPerConcept of the same concept in a row when an alternative exists', () => {
    const input = [
      card(1, 'A'),
      card(2, 'A'),
      card(3, 'A'),
      card(4, 'A'),
      card(5, 'B'),
      card(6, 'B'),
      card(7, 'B'),
      card(8, 'B'),
    ];
    const out = applyInterleaving(input, 2);
    expect(maxRun(out)).toBeLessThanOrEqual(2);
  });

  it('honors maxPerConcept = 1 (never two equal in a row when an alternative exists)', () => {
    const input = [
      card(1, 'A'),
      card(2, 'A'),
      card(3, 'A'),
      card(4, 'B'),
      card(5, 'B'),
      card(6, 'B'),
    ];
    const out = applyInterleaving(input, 1);
    expect(maxRun(out)).toBeLessThanOrEqual(1);
  });

  it('groups the null concept as its own (empty) group', () => {
    const input = [card(1, null), card(2, null), card(3, null), card(4, 'A')];
    const out = applyInterleaving(input, 2);
    expect(out).toHaveLength(4);
    expect(new Set(out.map((c) => c.id))).toEqual(new Set([1, 2, 3, 4]));
  });

  // EXACT-ORDER tests — pin the deterministic algorithm (Map preserves concept
  // insertion order), killing mutants of the queue logic.
  it('exact order: 4×A + 2×B (max 2) interleaves the Bs among the As', () => {
    const input = [
      card(1, 'A'),
      card(2, 'A'),
      card(3, 'A'),
      card(4, 'A'),
      card(5, 'B'),
      card(6, 'B'),
    ];
    const out = applyInterleaving(input, 2);
    expect(out.map((c) => c.id)).toEqual([1, 5, 2, 6, 3, 4]);
  });

  it('exact order with max 1: strictly alternates A and B', () => {
    const input = [
      card(1, 'A'),
      card(2, 'A'),
      card(3, 'A'),
      card(4, 'B'),
      card(5, 'B'),
      card(6, 'B'),
    ];
    const out = applyInterleaving(input, 1);
    expect(out.map((c) => c.id)).toEqual([1, 4, 2, 5, 3, 6]);
  });

  it('fallback: a single concept is forced to repeat, preserving order', () => {
    const input = [card(1, 'A'), card(2, 'A'), card(3, 'A'), card(4, 'A'), card(5, 'A')];
    const out = applyInterleaving(input, 2);
    expect(out.map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
  });
});
