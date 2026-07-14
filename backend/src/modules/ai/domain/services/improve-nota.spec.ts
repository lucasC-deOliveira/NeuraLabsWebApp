import { describe, it, expect } from 'vitest';
import { improveNotaMessages, improveNotaMaxTokens, parseImprovedNota } from './improve-nota';

describe('improveNotaMessages', () => {
  it('includes only the selected operations and the note content', () => {
    const user = improveNotaMessages({ titulo: 'T', conteudo: 'C' }, ['markdown'])[1].content;
    expect(user).toContain('Estilo Markdown');
    expect(user).not.toContain('Formatação e estrutura');
    expect(user).toContain('"titulo":"T"');
    expect(user).toContain('"conteudo":"C"');
  });
});

describe('improveNotaMaxTokens', () => {
  it('scales with content length but stays capped', () => {
    expect(improveNotaMaxTokens({ titulo: '', conteudo: '' })).toBe(500);
    expect(improveNotaMaxTokens({ titulo: 'a'.repeat(99999), conteudo: '' })).toBe(4000);
  });
});

describe('parseImprovedNota', () => {
  it('takes the improved fields from the model', () => {
    const out = parseImprovedNota(
      { titulo: 'Título', conteudo: '## Seção' },
      { titulo: 'T', conteudo: 'C' },
    );
    expect(out).toEqual({ titulo: 'Título', conteudo: '## Seção' });
  });

  it('keeps the original field when the model omits or blanks it', () => {
    const out = parseImprovedNota({ conteudo: '   ' }, { titulo: 'T', conteudo: 'C' });
    expect(out).toEqual({ titulo: 'T', conteudo: 'C' });
  });
});
