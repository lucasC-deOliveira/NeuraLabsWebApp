import { describe, it, expect } from 'vitest';
import { Grade } from './grade';

describe('Grade', () => {
  it('creates each valid grade', () => {
    for (const value of ['again', 'hard', 'good', 'easy'] as const) {
      expect(Grade.create(value).value).toBe(value);
    }
  });

  it('throws with the offending value and expected format on an invalid grade', () => {
    expect(() => Grade.create('perfect')).toThrowError(
      'invalid grade: "perfect". Expected: again|hard|good|easy',
    );
  });

  it('isAgain is true only for again', () => {
    expect(Grade.create('again').isAgain).toBe(true);
    expect(Grade.create('good').isAgain).toBe(false);
  });

  it('correct is the negation of again', () => {
    expect(Grade.create('again').correct).toBe(false);
    expect(Grade.create('hard').correct).toBe(true);
  });

  it('maps each grade to its stored confidence level', () => {
    expect(Grade.create('again').confidence).toBe(0);
    expect(Grade.create('hard').confidence).toBe(2);
    expect(Grade.create('good').confidence).toBe(4);
    expect(Grade.create('easy').confidence).toBe(5);
  });

  describe('fromLegacy', () => {
    it('not correct → again (regardless of confidence)', () => {
      expect(Grade.fromLegacy(false, 5).value).toBe('again');
    });
    it('correct with confidence <= 2 → hard', () => {
      expect(Grade.fromLegacy(true, 0).value).toBe('hard');
      expect(Grade.fromLegacy(true, 2).value).toBe('hard');
    });
    it('correct with confidence 3-4 → good', () => {
      expect(Grade.fromLegacy(true, 3).value).toBe('good');
      expect(Grade.fromLegacy(true, 4).value).toBe('good');
    });
    it('correct with confidence >= 5 → easy', () => {
      expect(Grade.fromLegacy(true, 5).value).toBe('easy');
    });
  });

  it('equals compares by value', () => {
    expect(Grade.create('good').equals(Grade.create('good'))).toBe(true);
    expect(Grade.create('good').equals(Grade.create('easy'))).toBe(false);
  });
});
