import { describe, it, expect } from 'vitest';
import { preview, flashcardHierarchy, type FlashcardConcept } from './available-item';

describe('preview', () => {
  it('returns the text unchanged when at most 50 chars', () => {
    expect(preview('short')).toBe('short');
  });

  it('truncates to 50 chars with an ellipsis when longer', () => {
    const result = preview('x'.repeat(60));
    expect(result).toBe('x'.repeat(50) + '...');
  });
});

describe('flashcardHierarchy', () => {
  it('builds the full Assunto → Tópico → Conceito path', () => {
    const c: FlashcardConcept = {
      nome: 'Mitose',
      topico: { nome: 'Divisão', assunto: { nome: 'Bio' } },
    };
    expect(flashcardHierarchy(c)).toBe('Bio → Divisão → Mitose');
  });

  it('falls back to "(sem tópico)" when there is no subject', () => {
    const c: FlashcardConcept = { nome: 'Mitose', topico: null };
    expect(flashcardHierarchy(c)).toBe('Mitose (sem tópico)');
  });

  it('falls back to "(sem tópico)" when the topic has no subject', () => {
    const c: FlashcardConcept = { nome: 'Mitose', topico: { nome: 'Divisão', assunto: null } };
    expect(flashcardHierarchy(c)).toBe('Mitose (sem tópico)');
  });

  it('returns "Sem conceito" when there is no concept', () => {
    expect(flashcardHierarchy(null)).toBe('Sem conceito');
  });
});
