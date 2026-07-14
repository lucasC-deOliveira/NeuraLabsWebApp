import { describe, it, expect } from 'vitest';
import { parseGraphListQuery, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './parse-graph-list-query';

describe('parseGraphListQuery', () => {
  it('applies defaults for an empty query', () => {
    expect(parseGraphListQuery({})).toEqual({
      q: undefined,
      tipo: 'todos',
      sort: 'recentes',
      createdFrom: undefined,
      createdTo: undefined,
      assuntoIds: undefined,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('splits the comma-separated assunto ids and drops blanks', () => {
    expect(parseGraphListQuery({ assunto: 'a1, a2 ,, a3' }).assuntoIds).toEqual(['a1', 'a2', 'a3']);
    expect(parseGraphListQuery({ assunto: ' , ' }).assuntoIds).toBeUndefined();
  });

  it('trims the search text and drops it when blank', () => {
    expect(parseGraphListQuery({ q: '  bio ' }).q).toBe('bio');
    expect(parseGraphListQuery({ q: '   ' }).q).toBeUndefined();
  });

  it('accepts valid tipo and sort values', () => {
    const parsed = parseGraphListQuery({ tipo: 'raiz', sort: 'alfabetica' });
    expect(parsed.tipo).toBe('raiz');
    expect(parsed.sort).toBe('alfabetica');
  });

  it('rejects an unknown tipo with the offending value and expected format', () => {
    expect(() => parseGraphListQuery({ tipo: 'folha' })).toThrow(
      'invalid tipo: "folha". Expected: todos|raiz|subgrafo',
    );
  });

  it('rejects an unknown sort with the offending value', () => {
    expect(() => parseGraphListQuery({ sort: 'aleatorio' })).toThrow(/invalid sort: "aleatorio"/);
  });

  it('parses page and clamps pageSize to the maximum', () => {
    const parsed = parseGraphListQuery({ page: '3', pageSize: '999' });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('rejects a non-positive page', () => {
    expect(() => parseGraphListQuery({ page: '0' })).toThrow(/invalid integer: "0"/);
  });

  it('parses ISO dates and rejects invalid ones', () => {
    expect(parseGraphListQuery({ createdFrom: '2026-01-01' }).createdFrom).toEqual(
      new Date('2026-01-01'),
    );
    expect(() => parseGraphListQuery({ createdTo: 'ontem' })).toThrow(/invalid createdTo: "ontem"/);
  });
});
