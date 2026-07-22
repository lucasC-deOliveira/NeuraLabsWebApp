import { describe, it, expect } from 'vitest';
import { performanceProfile } from './performance-profile';
import type { LearningStateRow, ReviewRow } from '../ports/flashcard-analytics-source';

const now = new Date('2026-07-22T12:00:00Z');
const review = (over: Partial<ReviewRow>): ReviewRow => ({
  data: now,
  acertou: true,
  nivelConfianca: 5,
  tempoResposta: 3000,
  tipoErro: null,
  ...over,
});
const axis = (profile: ReturnType<typeof performanceProfile>, name: string): number =>
  profile.find((a) => a.axis === name)!.value;

describe('performanceProfile', () => {
  it('returns the six radar axes', () => {
    const profile = performanceProfile([review({})], [], now);
    expect(profile.map((a) => a.axis)).toEqual([
      'Acurácia',
      'Velocidade',
      'Confiança',
      'Retenção',
      'Consistência',
      'Maturidade',
    ]);
  });

  it('scores a fast, confident, correct review near the top', () => {
    const profile = performanceProfile([review({})], [], now);
    expect(axis(profile, 'Acurácia')).toBe(100);
    expect(axis(profile, 'Velocidade')).toBe(100);
    expect(axis(profile, 'Confiança')).toBe(100);
    expect(axis(profile, 'Retenção')).toBe(100);
  });

  it('retention ignores low-confidence correct answers (lucky guesses)', () => {
    const profile = performanceProfile([review({ nivelConfianca: 2 })], [], now);
    expect(axis(profile, 'Retenção')).toBe(0);
    expect(axis(profile, 'Acurácia')).toBe(100);
  });

  it('maturity is the share of mature cards', () => {
    const states: LearningStateRow[] = [
      { fase: 'REVIEW', intervalo: 30, proximaRevisao: now },
      { fase: 'LEARN', intervalo: 0, proximaRevisao: now },
    ];
    expect(axis(performanceProfile([], states, now), 'Maturidade')).toBe(50);
  });

  it('is all zeros with no data', () => {
    expect(performanceProfile([], [], now).every((a) => a.value === 0)).toBe(true);
  });
});
