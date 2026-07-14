import { describe, it, expect } from 'vitest';
import {
  improveFlashcardMessages,
  improveMaxTokens,
  normalizeOperations,
  parseImprovedFlashcard,
} from './improve-flashcard';

describe('normalizeOperations', () => {
  it('keeps only valid operations, without duplicates', () => {
    expect(normalizeOperations(['markdown', 'markdown', 'bogus', 'format'])).toEqual([
      'format',
      'markdown',
    ]);
  });

  it('throws with the offending value when nothing valid remains', () => {
    expect(() => normalizeOperations(['nope'])).toThrow(/no valid improve operations/);
    expect(() => normalizeOperations(undefined)).toThrow(/format\|markdown\|content/);
  });
});

describe('improveFlashcardMessages', () => {
  it('includes only the selected operations and the flashcard content', () => {
    const msgs = improveFlashcardMessages({ pergunta: 'Q', resposta: 'A' }, ['markdown']);
    const user = msgs[1].content;
    expect(user).toContain('Estilo Markdown');
    expect(user).not.toContain('Formatação e estrutura'); // not selected → not sent (economia)
    expect(user).toContain('"pergunta":"Q"');
    expect(user).toContain('"resposta":"A"');
  });
});

describe('improveMaxTokens', () => {
  it('scales with content length but stays capped', () => {
    expect(improveMaxTokens({ pergunta: '', resposta: '' })).toBe(400);
    expect(improveMaxTokens({ pergunta: 'a'.repeat(9999), resposta: 'a'.repeat(9999) })).toBe(2000);
  });
});

describe('parseImprovedFlashcard', () => {
  it('takes the improved fields from the model', () => {
    const out = parseImprovedFlashcard(
      { pergunta: '**Q**', resposta: '- A' },
      { pergunta: 'Q', resposta: 'A' },
    );
    expect(out).toEqual({ pergunta: '**Q**', resposta: '- A' });
  });

  it('keeps the original field when the model omits or blanks it', () => {
    const out = parseImprovedFlashcard({ resposta: '   ' }, { pergunta: 'Q', resposta: 'A' });
    expect(out).toEqual({ pergunta: 'Q', resposta: 'A' });
  });
});
