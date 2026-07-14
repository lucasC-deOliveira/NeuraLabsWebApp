import { describe, it, expect } from 'vitest';
import { relationTier, assuntoWeight } from './assunto-weight';

describe('relationTier', () => {
  it('gives structural relations the highest tier', () => {
    expect(relationTier('CONTEM')).toBe(3);
    expect(relationTier('IS_A')).toBe(3);
    expect(relationTier('COBRE')).toBe(3);
  });

  it('gives dependency relations the middle tier', () => {
    expect(relationTier('PREREQUISITO')).toBe(2);
    expect(relationTier('DEPENDE_DE')).toBe(2);
  });

  it('gives content relations a low tier and associative ones the floor', () => {
    expect(relationTier('DEFINE')).toBe(1.5);
    expect(relationTier('RELACIONADO')).toBe(1);
  });

  it('falls back to the associative tier for unknown relation types', () => {
    expect(relationTier('WHATEVER')).toBe(1);
  });
});

describe('assuntoWeight', () => {
  it('is zero when the assunto has no connections', () => {
    expect(assuntoWeight([])).toBe(0);
  });

  it('sums tier × edge weight across connections (count and type both matter)', () => {
    const weight = assuntoWeight([
      { tipoRelacao: 'CONTEM', peso: 2 }, // 3 × 2 = 6
      { tipoRelacao: 'RELACIONADO', peso: 1 }, // 1 × 1 = 1
    ]);
    expect(weight).toBe(7);
  });

  it('ranks a densely structural assunto above a loosely related one', () => {
    const structural = assuntoWeight([
      { tipoRelacao: 'CONTEM', peso: 1 },
      { tipoRelacao: 'PART_OF', peso: 1 },
    ]);
    const associative = assuntoWeight([
      { tipoRelacao: 'RELACIONADO', peso: 1 },
      { tipoRelacao: 'REFERENCIA', peso: 1 },
      { tipoRelacao: 'REFERENCIA', peso: 1 },
    ]);
    expect(structural).toBeGreaterThan(associative);
  });
});
