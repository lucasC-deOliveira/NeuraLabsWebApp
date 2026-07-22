import { describe, it, expect } from 'vitest';
import { hardestQuestions, accuracyByType } from './question-difficulty';
import type { QuestionStatRow } from '../ports/prova-analytics-source';

const stat = (enunciado: string, tipo: string, total: number, wrong: number): QuestionStatRow => ({
  enunciado,
  tipo,
  total,
  wrong,
});

describe('hardestQuestions', () => {
  it('ranks by wrong count and adds accuracy, keeping the worst `limit`', () => {
    const out = hardestQuestions(
      [stat('A', 'MULTIPLA_ESCOLHA', 10, 2), stat('B', 'MULTIPLA_ESCOLHA', 10, 6)],
      1,
    );
    expect(out).toEqual([{ enunciado: 'B', total: 10, wrong: 6, accuracy: 40 }]);
  });

  it('ignores questions never missed', () => {
    expect(hardestQuestions([stat('A', 'VERDADEIRO_FALSO', 5, 0)])).toEqual([]);
  });
});

describe('accuracyByType', () => {
  it('aggregates accuracy per question type', () => {
    const out = accuracyByType([
      stat('A', 'MULTIPLA_ESCOLHA', 10, 4),
      stat('B', 'MULTIPLA_ESCOLHA', 10, 6),
      stat('C', 'VERDADEIRO_FALSO', 4, 1),
    ]);
    expect(out).toEqual([
      { tipo: 'MULTIPLA_ESCOLHA', accuracy: 50, total: 20 },
      { tipo: 'VERDADEIRO_FALSO', accuracy: 75, total: 4 },
    ]);
  });
});
