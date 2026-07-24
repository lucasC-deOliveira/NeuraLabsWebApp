import { describe, it, expect } from 'vitest';
import {
  parseFeynmanAngulo,
  feynmanRubric,
  isFeynmanSessionComplete,
  FEYNMAN_CLARO,
  type FeynmanAngulo,
} from './feynman-angulo';

describe('parseFeynmanAngulo', () => {
  it('accepts the three angles case-insensitively', () => {
    expect(parseFeynmanAngulo('analogia')).toBe('ANALOGIA');
    expect(parseFeynmanAngulo('TECNICO')).toBe('TECNICO');
  });

  it('defaults to SIMPLES for anything unknown', () => {
    expect(parseFeynmanAngulo('xpto')).toBe('SIMPLES');
    expect(parseFeynmanAngulo(undefined)).toBe('SIMPLES');
  });
});

describe('feynmanRubric', () => {
  it('gives a distinct rubric per angle', () => {
    const s = feynmanRubric('SIMPLES');
    const a = feynmanRubric('ANALOGIA');
    const t = feynmanRubric('TECNICO');
    expect(new Set([s, a, t]).size).toBe(3);
    expect(t).toContain('jargão'); // técnico trata jargão diferente
  });
});

describe('isFeynmanSessionComplete', () => {
  const map = (s: number, a: number, t: number): Map<FeynmanAngulo, number> =>
    new Map<FeynmanAngulo, number>([
      ['SIMPLES', s],
      ['ANALOGIA', a],
      ['TECNICO', t],
    ]);

  it('is complete only when all three reach the threshold', () => {
    expect(isFeynmanSessionComplete(map(FEYNMAN_CLARO, 90, 75))).toBe(true);
  });

  it('is incomplete when the weakest angle is below the threshold', () => {
    expect(isFeynmanSessionComplete(map(90, 90, FEYNMAN_CLARO - 1))).toBe(false);
  });

  it('is incomplete when an angle is missing', () => {
    expect(isFeynmanSessionComplete(new Map([['SIMPLES', 100]]))).toBe(false);
  });
});
