import { describe, it, expect } from 'vitest';
import { planPositionUpdates } from './position-plan';

describe('planPositionUpdates', () => {
  it('maps a prefixed key to a typed node update', () => {
    expect(planPositionUpdates({ 'conceito:abc': { x: 1, y: 2 } })).toEqual([
      { tipoNode: 'CONCEITO', referenciaId: 'abc', x: 1, y: 2 },
    ]);
  });

  it('is case-insensitive on the prefix', () => {
    expect(planPositionUpdates({ 'Flashcard:f1': { x: 0, y: 0 } })[0]?.tipoNode).toBe('FLASHCARD');
  });

  it('keeps the rest of the id when it contains colons', () => {
    expect(planPositionUpdates({ 'nota:a:b': { x: 0, y: 0 } })[0]?.referenciaId).toBe('a:b');
  });

  it('skips unprefixed keys', () => {
    expect(planPositionUpdates({ plainId: { x: 1, y: 1 } })).toEqual([]);
  });

  it('skips keys with an unknown prefix', () => {
    expect(planPositionUpdates({ 'prova:p1': { x: 1, y: 1 } })).toEqual([]);
  });
});
