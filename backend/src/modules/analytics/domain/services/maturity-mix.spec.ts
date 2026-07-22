import { describe, it, expect } from 'vitest';
import { maturityMix } from './maturity-mix';
import type { LearningStateRow } from '../ports/flashcard-analytics-source';

const state = (fase: string, intervalo: number): LearningStateRow => ({
  fase,
  intervalo,
  proximaRevisao: new Date(),
});

describe('maturityMix', () => {
  it('classifies learning, young and mature cards', () => {
    const mix = maturityMix([
      state('LEARN', 0),
      state('RELEARN', 0),
      state('REVIEW', 5),
      state('REVIEW', 20),
      state('REVIEW', 21),
      state('REVIEW', 60),
    ]);
    expect(mix).toEqual({ learning: 2, young: 2, mature: 2 });
  });

  it('is all zeros for no cards', () => {
    expect(maturityMix([])).toEqual({ learning: 0, young: 0, mature: 0 });
  });
});
