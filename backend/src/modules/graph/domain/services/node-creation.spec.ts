import { describe, it, expect } from 'vitest';
import { assertCreatableNode, type CreateNodeInput } from './node-creation';
import { NodeValidationError, UnknownNodeTypeError } from '../errors';

const input = (over: Partial<CreateNodeInput>): CreateNodeInput => ({ tipoNode: 'NOTA', ...over });

describe('assertCreatableNode', () => {
  it('accepts a simple structural node', () => {
    expect(() => assertCreatableNode(input({ tipoNode: 'ASSUNTO', nome: 'Bio' }))).not.toThrow();
  });

  it('rejects an unknown node type', () => {
    expect(() => assertCreatableNode(input({ tipoNode: 'GRAFO_REF' }))).toThrow(
      UnknownNodeTypeError,
    );
  });

  it('requires a note title', () => {
    expect(() => assertCreatableNode(input({ titulo: '  ', subtipo: 'EXPLICACAO' }))).toThrow(
      new NodeValidationError('NOTE_TITLE_REQUIRED'),
    );
  });

  it('requires a valid note subtype', () => {
    expect(() => assertCreatableNode(input({ titulo: 'T', subtipo: 'NOPE' }))).toThrow(
      new NodeValidationError('NOTE_SUBTYPE_REQUIRED'),
    );
  });

  it('requires a source for literature notes', () => {
    expect(() =>
      assertCreatableNode(input({ titulo: 'T', subtipo: 'EXPLICACAO', tipoNota: 'LITERATURA' })),
    ).toThrow(new NodeValidationError('LITERATURE_NOTE_SOURCE_REQUIRED'));
  });

  it('accepts a valid literature note with a source', () => {
    expect(() =>
      assertCreatableNode(
        input({ titulo: 'T', subtipo: 'EXPLICACAO', tipoNota: 'LITERATURA', fonte: 'Livro' }),
      ),
    ).not.toThrow();
  });

  it('requires raw text for a TEXTO_BRUTO node', () => {
    expect(() => assertCreatableNode(input({ tipoNode: 'TEXTO_BRUTO', texto: '  ' }))).toThrow(
      new NodeValidationError('RAW_TEXT_REQUIRED'),
    );
  });
});
