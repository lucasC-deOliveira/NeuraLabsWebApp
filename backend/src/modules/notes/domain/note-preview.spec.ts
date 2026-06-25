import { describe, it, expect } from 'vitest';
import { derivePreview } from './note-preview';

describe('derivePreview', () => {
  it('takes the title from the first heading and the preview from the rest', () => {
    const { titulo, preview, wordCount } = derivePreview('# Mitose\n\nDivisão celular em fases.');
    expect(titulo).toBe('Mitose');
    expect(preview).toBe('Divisão celular em fases.');
    // word count is over the whole content, including the leading "#" token (legacy)
    expect(wordCount).toBe(6);
  });

  it('falls back to "Sem titulo" for empty content', () => {
    expect(derivePreview('')).toEqual({ titulo: 'Sem titulo', preview: '', wordCount: 0 });
  });
});
