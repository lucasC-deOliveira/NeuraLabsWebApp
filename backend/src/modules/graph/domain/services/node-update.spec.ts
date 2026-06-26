import { describe, it, expect } from 'vitest';
import { assertUpdatableNode } from './node-update';
import { NodeValidationError, UnknownNodeTypeError } from '../errors';

describe('assertUpdatableNode', () => {
  it('accepts an editable type', () => {
    expect(() => assertUpdatableNode('CONCEITO', { nome: 'X' })).not.toThrow();
  });

  it('rejects a non-editable type', () => {
    expect(() => assertUpdatableNode('BARALHO', {})).toThrow(UnknownNodeTypeError);
  });

  it('accepts a NOTA without a subtype change', () => {
    expect(() => assertUpdatableNode('NOTA', { titulo: 'X' })).not.toThrow();
  });

  it('rejects an invalid NOTA subtype', () => {
    expect(() => assertUpdatableNode('NOTA', { subtipo: 'NOPE' })).toThrow(
      new NodeValidationError('INVALID_NOTE_SUBTYPE'),
    );
  });

  it('accepts a valid NOTA subtype', () => {
    expect(() => assertUpdatableNode('NOTA', { subtipo: 'EXEMPLO' })).not.toThrow();
  });
});
