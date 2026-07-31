import { describe, it, expect } from 'vitest';
import { conceptMastery, type ConceptSignals } from './concept-mastery';

const signals = (s: Partial<ConceptSignals>): ConceptSignals => ({
  flashcardMastery: null,
  questionAccuracy: null,
  feynmanClarity: null,
  ...s,
});

describe('conceptMastery', () => {
  it('is dominated when the only evidence (flashcards) is strong', () => {
    expect(conceptMastery(signals({ flashcardMastery: 0.8 })).dominated).toBe(true);
  });

  // A regra do usuário: forte em TODAS as evidências que existem. Questões fracas
  // seguram o conceito mesmo com flashcards e Feynman ótimos.
  it('is NOT dominated when any present evidence is weak', () => {
    const m = conceptMastery(
      signals({ flashcardMastery: 0.9, questionAccuracy: 0.4, feynmanClarity: 90 }),
    );
    expect(m.dominated).toBe(false);
    expect(m.evidenceCount).toBe(3);
  });

  it('is dominated when all three evidences are strong', () => {
    expect(
      conceptMastery(signals({ flashcardMastery: 0.7, questionAccuracy: 0.85, feynmanClarity: 80 }))
        .dominated,
    ).toBe(true);
  });

  it('reads the Feynman clarity on its 0..100 scale', () => {
    expect(conceptMastery(signals({ feynmanClarity: 75 })).dominated).toBe(true);
    expect(conceptMastery(signals({ feynmanClarity: 35 })).dominated).toBe(false);
  });

  // Um conceito que você nunca estudou não é "dominado" — é desconhecido.
  it('is not dominated with no evidence at all', () => {
    const m = conceptMastery(signals({}));
    expect(m).toEqual({ dominated: false, score: 0, evidenceCount: 0 });
  });

  it('scores by the average of the present evidences (for a % of mastery)', () => {
    // flashcards 0.6 + feynman 80/100=0.8 → média 0.7
    expect(
      conceptMastery(signals({ flashcardMastery: 0.6, feynmanClarity: 80 })).score,
    ).toBeCloseTo(0.7);
  });
});
