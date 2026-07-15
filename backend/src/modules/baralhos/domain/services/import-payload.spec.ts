import { describe, it, expect } from 'vitest';
import { parseImportedBaralhos } from './import-payload';
import { normalizeBaralhoTitle } from './baralho-title';
import { EmptyImportError, InvalidBaralhoTitleError } from '../errors';

describe('parseImportedBaralhos', () => {
  it('reads the export format of this app', () => {
    const raw = [{ titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] }];
    expect(parseImportedBaralhos(raw)).toEqual([
      { titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] },
    ]);
  });

  it('reads the legacy disrupt format (title/answer)', () => {
    const raw = [{ title: 'Bio', cards: [{ title: 'p', answer: 'r' }] }];
    expect(parseImportedBaralhos(raw)).toEqual([
      { titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] },
    ]);
  });

  it('accepts a single baralho outside an array', () => {
    const raw = { titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] };
    expect(parseImportedBaralhos(raw)).toHaveLength(1);
  });

  it('trims text and drops cards missing a side', () => {
    const raw = [
      {
        titulo: '  Bio  ',
        cards: [
          { pergunta: ' p ', resposta: ' r ' },
          { pergunta: 'sem resposta', resposta: '   ' },
          { resposta: 'sem pergunta' },
        ],
      },
    ];
    expect(parseImportedBaralhos(raw)).toEqual([
      { titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] },
    ]);
  });

  it('drops baralhos without a title or without usable cards', () => {
    const raw = [
      { titulo: '', cards: [{ pergunta: 'p', resposta: 'r' }] },
      { titulo: 'Vazio', cards: [] },
      { titulo: 'Bom', cards: [{ pergunta: 'p', resposta: 'r' }] },
    ];
    expect(parseImportedBaralhos(raw).map((b) => b.titulo)).toEqual(['Bom']);
  });

  it('ignores unknown extra fields (photo, id, evaluation)', () => {
    const raw = [
      { id: 'x', photo: 'p.png', title: 'Bio', cards: [{ title: 'p', answer: 'r', times: 3 }] },
    ];
    expect(parseImportedBaralhos(raw)).toEqual([
      { titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] },
    ]);
  });

  it('rejects payloads with nothing importable', () => {
    expect(() => parseImportedBaralhos([])).toThrow(EmptyImportError);
    expect(() => parseImportedBaralhos('lixo')).toThrow(EmptyImportError);
    expect(() => parseImportedBaralhos(null)).toThrow(EmptyImportError);
    expect(() => parseImportedBaralhos([{ titulo: 'Vazio', cards: [] }])).toThrow(EmptyImportError);
  });
});

describe('normalizeBaralhoTitle', () => {
  it('trims the title', () => {
    expect(normalizeBaralhoTitle('  Bio  ')).toBe('Bio');
  });

  it('rejects a blank title, naming the offending value', () => {
    expect(() => normalizeBaralhoTitle('   ')).toThrow(InvalidBaralhoTitleError);
    expect(() => normalizeBaralhoTitle('   ')).toThrow(/Expected: 1\.\.120/);
  });

  it('rejects a title longer than 120 characters', () => {
    expect(() => normalizeBaralhoTitle('a'.repeat(121))).toThrow(InvalidBaralhoTitleError);
    expect(normalizeBaralhoTitle('a'.repeat(120))).toHaveLength(120);
  });
});
