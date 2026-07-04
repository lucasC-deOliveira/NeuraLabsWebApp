import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanExamText } from './exam-text-cleaning';

// Texto real extraído das 4 primeiras páginas de um caderno do ENEM 2025 (pdf-parse).
const enem = readFileSync(join(__dirname, '__fixtures__/enem-4pages.txt'), 'utf8');

describe('cleanExamText', () => {
  it('drops the cover/instructions before the first question', () => {
    const cleaned = cleanExamText(enem);
    expect(cleaned).toMatch(/^QUEST[ÃA]O\s*91/i);
    expect(cleaned).not.toContain('LEIA ATENTAMENTE AS INSTRUÇÕES');
    expect(cleaned).not.toContain('CARTÃO-RESPOSTA');
  });

  it('keeps the actual question content', () => {
    const cleaned = cleanExamText(enem);
    expect(cleaned).toContain('cajueiro');
    expect(cleaned).toContain('cobalto-60');
  });

  it('removes barcode lines and shrinks the payload', () => {
    const cleaned = cleanExamText(enem);
    expect(cleaned).not.toMatch(/^\*\d+VE\d+\*$/m);
    expect(cleaned.length).toBeLessThan(enem.length);
  });

  it('returns the text unchanged (minus noise) when there is no question marker', () => {
    const out = cleanExamText('texto qualquer sem questoes\n\n\noutra linha');
    expect(out).toBe('texto qualquer sem questoes\n\noutra linha');
  });
});
