import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractExamQuestions, countExamQuestions } from './extract-exam-questions';
import { cleanExamText } from './exam-text-cleaning';

const enem = cleanExamText(readFileSync(join(__dirname, '__fixtures__/enem-4pages.txt'), 'utf8'));

describe('extractExamQuestions (ENEM real)', () => {
  const questoes = extractExamQuestions(enem);

  it('extracts the questions in order as multiple-choice with 5 alternatives', () => {
    expect(questoes.length).toBeGreaterThanOrEqual(3);
    expect(questoes.slice(0, 3).map((q) => q.numero)).toEqual([91, 92, 93]);
    for (const q of questoes.slice(0, 3)) {
      expect(q.tipo).toBe('MULTIPLA_ESCOLHA');
      expect(q.alternativas).toHaveLength(5);
      expect(q.alternativas?.map((a) => a.letra)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(q.gabarito).toBe('?');
    }
  });

  it('rejoins words broken across lines by pdf-parse', () => {
    const q91 = questoes.find((q) => q.numero === 91)!;
    expect(q91.enunciado).toContain('cajueiro');
    // "fe"+"nilação." and "des"+"carboxilação." were split across lines
    expect(q91.alternativas?.[1].texto).toBe('fenilação.');
    expect(q91.alternativas?.[4].texto).toBe('descarboxilação.');
    expect(q91.alternativas?.[0].texto).toBe('hidrólise.');
  });

  it('does not mistake a stem starting with "A " for an alternative', () => {
    const q92 = questoes.find((q) => q.numero === 92)!;
    expect(q92.enunciado).toContain('química nuclear');
    expect(q92.alternativas?.[0].texto).toContain('2,00');
  });
});

describe('countExamQuestions', () => {
  it('counts the question markers', () => {
    expect(countExamQuestions('QUESTÃO 1 ...\nQUESTÃO 2 ...')).toBe(2);
    expect(countExamQuestions('sem marcadores')).toBe(0);
  });
});
