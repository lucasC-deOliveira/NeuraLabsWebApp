import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGabarito } from './parse-gabarito';

const enem = readFileSync(join(__dirname, '__fixtures__/gabarito-enem-d2-cd8.txt'), 'utf8');

describe('parseGabarito (ENEM answer key)', () => {
  const map = parseGabarito(enem);

  it('maps every question number to its answer letter', () => {
    expect(map.get(91)).toBe('E');
    expect(map.get(93)).toBe('B');
    expect(map.get(96)).toBe('C');
    expect(map.get(180)).toBe('A');
  });

  it('marks annulled questions as ANULADA', () => {
    expect(map.get(132)).toBe('ANULADA');
    expect(map.get(135)).toBe('ANULADA');
  });

  it('covers the whole 91–180 range', () => {
    expect(map.size).toBe(90);
    for (let n = 91; n <= 180; n++) expect(map.has(n)).toBe(true);
  });
});

const cebraspe = readFileSync(join(__dirname, '__fixtures__/gabarito-cebraspe-multi.txt'), 'utf8');

describe('parseGabarito (CEBRASPE Certo/Errado grid)', () => {
  const map = parseGabarito(cebraspe);

  it('numbers items continuously across blocks, mapping C→V and E→F', () => {
    // First grid row starts "CCEE…": item 1=C→V, item 3=E→F.
    expect(map.get(1)).toBe('V');
    expect(map.get(3)).toBe('F');
    // CB1 (50) + cargo 001 (70) = 120 items, matching the prova's 1–120.
    expect(map.size).toBe(120);
  });

  it('marks X (item annulled) as ANULADA', () => {
    // Row "CCEECEECCEEXCCECECEC": the X is the 12th mark.
    expect(map.get(12)).toBe('ANULADA');
  });
});

describe('parseGabarito (unrecognized)', () => {
  it('returns an empty map when there are no answer lines', () => {
    expect(parseGabarito('texto qualquer\nsem gabarito').size).toBe(0);
  });
});
