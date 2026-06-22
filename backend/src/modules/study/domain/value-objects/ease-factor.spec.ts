import { describe, it, expect } from 'vitest';
import { EaseFactor } from './ease-factor';

describe('EaseFactor', () => {
  it('creates a valid ease factor at or above the minimum', () => {
    expect(EaseFactor.create(2.5).value).toBe(2.5);
    expect(EaseFactor.create(EaseFactor.MIN).value).toBe(EaseFactor.MIN);
  });

  it('throws with the offending value when below the minimum', () => {
    expect(() => EaseFactor.create(1.0)).toThrowError(
      'invalid ease factor: "1". Expected: a finite number >= 1.3',
    );
  });

  it('throws on a non-finite value', () => {
    expect(() => EaseFactor.create(Number.NaN)).toThrowError(/invalid ease factor/);
  });

  it('clamped never drops below the minimum', () => {
    expect(EaseFactor.clamped(1.0).value).toBe(EaseFactor.MIN);
    expect(EaseFactor.clamped(2.0).value).toBe(2.0);
  });

  it('equals compares by value', () => {
    expect(EaseFactor.create(2.5).equals(EaseFactor.create(2.5))).toBe(true);
    expect(EaseFactor.create(2.5).equals(EaseFactor.create(2.3))).toBe(false);
  });
});
