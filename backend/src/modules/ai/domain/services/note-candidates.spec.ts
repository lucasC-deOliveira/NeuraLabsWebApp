import { describe, it, expect } from 'vitest';
import { selectNoteCandidates } from './note-candidates';

describe('selectNoteCandidates', () => {
  it('maps notes and applies defaults for missing fields', () => {
    expect(selectNoteCandidates([{ titulo: 'A', conteudo: 'x' }, { conteudo: 'y' }, {}])).toEqual([
      { titulo: 'A', conteudo: 'x', conceitosPrevistos: [] },
      { titulo: 'Nota sem título', conteudo: 'y', conceitosPrevistos: [] },
      { titulo: 'Nota sem título', conteudo: '', conceitosPrevistos: [] },
    ]);
  });

  it('ignores non-string fields', () => {
    expect(selectNoteCandidates([{ titulo: 42, conteudo: null }])).toEqual([
      { titulo: 'Nota sem título', conteudo: '', conceitosPrevistos: [] },
    ]);
  });
});
