import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractJudgmentItems, countJudgmentItems } from './extract-judgment-items';
import { cleanExamText } from './exam-text-cleaning';

// Real text extracted from an 8-page CEBRASPE (SERPRO 2023) booklet (pdf-parse):
// 120 judgment ("Certo/Errado") items, no "QUESTÃO N" markers, no alternatives.
const cebraspe = cleanExamText(
  readFileSync(join(__dirname, '__fixtures__/cebraspe-8pages.txt'), 'utf8'),
);

describe('extractJudgmentItems (CEBRASPE real)', () => {
  const questoes = extractJudgmentItems(cebraspe);

  it('extracts nearly all 120 items as VERDADEIRO_FALSO without alternatives', () => {
    expect(questoes.length).toBeGreaterThanOrEqual(110);
    expect(questoes[0].numero).toBe(1);
    expect(questoes[questoes.length - 1].numero).toBe(120);
    for (const q of questoes) {
      expect(q.tipo).toBe('VERDADEIRO_FALSO');
      expect(q.alternativas).toBeNull();
      expect(q.gabarito).toBe('?');
    }
  });

  it('keeps item numbers strictly increasing', () => {
    const numeros = questoes.map((q) => q.numero);
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b));
    expect(new Set(numeros).size).toBe(numeros.length);
  });

  it('prefixes the first group with its support text and command', () => {
    const q1 = questoes.find((q) => q.numero === 1)!;
    expect(q1.enunciado).toContain('Drummond'); // from the support text (crônica)
    expect(q1.enunciado).toContain('Julgue os itens que se seguem');
    expect(q1.enunciado).toContain('Entende-se do texto');
  });

  it('switches the command when a new group starts', () => {
    const q6 = questoes.find((q) => q.numero === 6)!;
    expect(q6.enunciado).toContain('Considerando os aspectos linguísticos');
    expect(q6.enunciado).toContain('rogou-lhe');
    expect(q6.enunciado).not.toContain('Julgue os itens que se seguem, a respeito das ideias');
  });

  it('carries proposition definitions (P1..P6) as context for their group', () => {
    const q40 = questoes.find((q) => q.numero === 40)!;
    expect(q40.enunciado).toContain('P1:');
    expect(q40.enunciado).toContain('Tendo como referência as proposições');
    expect(q40.enunciado).toContain('É válido o argumento');
  });

  it('handles English sections ("judge the following items")', () => {
    const q19 = questoes.find((q) => q.numero === 19)!;
    expect(q19.enunciado).toContain('judge the following items');
    expect(q19.enunciado).toContain('Data art');
  });

  it('rejoins words wrapped across lines by pdf-parse', () => {
    const q89 = questoes.find((q) => q.numero === 89)!;
    expect(q89.enunciado).toContain('estratégia ruim, deve ser evitada');
  });

  it('does not leak the next group context into the previous item', () => {
    const q37 = questoes.find((q) => q.numero === 37)!;
    expect(q37.enunciado).not.toContain('P1:');
    const q24 = questoes.find((q) => q.numero === 24)!;
    expect(q24.enunciado).not.toContain('Tracy Chou');
  });

  it('returns nothing for texts without judgment commands', () => {
    expect(extractJudgmentItems('1 primeiro item\n2 segundo item')).toEqual([]);
  });
});

describe('countJudgmentItems', () => {
  it('reports the expected total from the item numbering', () => {
    expect(countJudgmentItems(cebraspe)).toBe(120);
  });

  it('is zero without sequential items or without a judgment command', () => {
    expect(countJudgmentItems('sem itens numerados, julgue')).toBe(0);
    expect(countJudgmentItems('1 primeiro item\n2 segundo item')).toBe(0);
  });
});
