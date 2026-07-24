import { describe, it, expect } from 'vitest';
import { feynmanNoteTitle, feynmanNoteFonte, composeFeynmanNote } from './feynman-note';

describe('feynmanNoteTitle', () => {
  it('prefixes the target label', () => {
    expect(feynmanNoteTitle('Recursão')).toBe('Explicação: Recursão');
  });

  it('falls back to a generic label when blank', () => {
    expect(feynmanNoteTitle('   ')).toBe('Explicação: conceito');
  });

  it('truncates a long label with an ellipsis', () => {
    const title = feynmanNoteTitle('a'.repeat(80));
    expect(title.startsWith('Explicação: ')).toBe(true);
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBe('Explicação: '.length + 60);
  });
});

describe('feynmanNoteFonte', () => {
  it('builds a deterministic per-target marker', () => {
    expect(feynmanNoteFonte('CONCEITO', 'c1')).toBe('feynman:CONCEITO:c1');
    expect(feynmanNoteFonte('FLASHCARD', 'f9')).toBe('feynman:FLASHCARD:f9');
  });
});

describe('composeFeynmanNote', () => {
  it('renders one section per filled angle', () => {
    const out = composeFeynmanNote([
      { titulo: 'Simples', texto: 'a' },
      { titulo: 'Analogia', texto: 'b' },
      { titulo: 'Técnico', texto: 'c' },
    ]);
    expect(out).toBe('## Simples\n\na\n\n## Analogia\n\nb\n\n## Técnico\n\nc');
  });

  it('drops empty angles', () => {
    const out = composeFeynmanNote([
      { titulo: 'Simples', texto: 'a' },
      { titulo: 'Analogia', texto: '   ' },
    ]);
    expect(out).toBe('a'); // uma seção só → texto puro, sem cabeçalho
  });

  it('returns empty when nothing was written', () => {
    expect(composeFeynmanNote([{ titulo: 'Simples', texto: '' }])).toBe('');
  });
});
