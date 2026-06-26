import { describe, it, expect } from 'vitest';
import { Phase } from './phase';

describe('Phase', () => {
  it('creates each valid phase', () => {
    for (const value of ['LEARN', 'REVIEW', 'RELEARN'] as const) {
      expect(Phase.create(value).value).toBe(value);
    }
  });

  it('throws with the offending value and expected format on an invalid phase', () => {
    expect(() => Phase.create('DONE')).toThrowError(
      'invalid phase: "DONE". Expected: LEARN|REVIEW|RELEARN',
    );
  });

  it('is matches the underlying value', () => {
    expect(Phase.create('REVIEW').is('REVIEW')).toBe(true);
    expect(Phase.create('REVIEW').is('LEARN')).toBe(false);
  });

  it('equals compares by value', () => {
    expect(Phase.create('LEARN').equals(Phase.create('LEARN'))).toBe(true);
    expect(Phase.create('LEARN').equals(Phase.create('RELEARN'))).toBe(false);
  });
});
