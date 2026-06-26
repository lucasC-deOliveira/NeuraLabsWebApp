import { describe, it, expect } from 'vitest';
import { normalizeEmail } from './email';

describe('normalizeEmail', () => {
  it('trims surrounding whitespace and lowercases', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });

  it('leaves an already-canonical email unchanged', () => {
    expect(normalizeEmail('foo@bar.com')).toBe('foo@bar.com');
  });
});
