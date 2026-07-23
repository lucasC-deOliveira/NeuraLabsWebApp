import { describe, it, expect } from 'vitest';
import { clampDays } from './period';

describe('clampDays', () => {
  it('keeps a valid number', () => {
    expect(clampDays('30')).toBe(30);
    expect(clampDays(90)).toBe(90);
  });

  it('falls back to the default (90) for missing/invalid input', () => {
    expect(clampDays(undefined)).toBe(90);
    expect(clampDays('abc')).toBe(90);
    expect(clampDays(0)).toBe(90);
    expect(clampDays(-5)).toBe(90);
  });

  it('clamps to the max (~100 years) for "tudo"', () => {
    expect(clampDays(999_999)).toBe(36_500);
  });
});
