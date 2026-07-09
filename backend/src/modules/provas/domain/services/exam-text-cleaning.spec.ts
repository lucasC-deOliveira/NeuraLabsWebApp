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

  // These per-page artifacts carry the page number, so they are never verbatim
  // across pages and slip past the repeated-line dedup — they need their own regex.
  it('removes InDesign export footers, running headers and tiled watermarks', () => {
    const cleaned = cleanExamText(enem);
    expect(cleaned).not.toMatch(/\.ind[bd]/);
    expect(cleaned).not.toMatch(/\|\s*CADERNO\s+\d+\s*\|/i);
    expect(cleaned).not.toMatch(/ENEM\d{4}ENEM\d{4}/i);
  });

  it('returns the text unchanged (minus noise) when there is no question marker', () => {
    const out = cleanExamText('texto qualquer sem questoes\n\n\noutra linha');
    expect(out).toBe('texto qualquer sem questoes\n\noutra linha');
  });
});

// Texto real extraído de um caderno CEBRASPE (SERPRO 2023) de 8 páginas (pdf-parse).
const cebraspe = readFileSync(join(__dirname, '__fixtures__/cebraspe-8pages.txt'), 'utf8');

describe('cleanExamText (CEBRASPE / judgment exams)', () => {
  const cleaned = cleanExamText(cebraspe);

  it('drops the cover/instructions at the first section divider when there is no QUESTÃO marker', () => {
    expect(cleaned).toMatch(/^--\s*PROVAS OBJETIVAS\s*--/);
    expect(cleaned).not.toContain('não receberão pontuação negativa');
  });

  it('drops repeated per-page headers, watermarks and print codes', () => {
    expect(cleaned).not.toContain('pcimarkpci');
    expect(cleaned).not.toContain('www.pciconcursos.com.br');
    expect(cleaned).not.toContain('CEBRASPE – SERPRO');
    expect(cleaned).not.toContain('846CB101721688');
    expect(cleaned).not.toContain('84600101344553');
  });

  it('drops "Espaço livre" filler lines but keeps the item content', () => {
    expect(cleaned).not.toMatch(/^Espaço livre/m);
    expect(cleaned).toContain('Nikola Tesla');
    expect(cleaned).toContain('data lake');
  });
});
