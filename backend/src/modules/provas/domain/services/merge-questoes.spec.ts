import { describe, it, expect } from 'vitest';
import { mergeQuestoes } from './merge-questoes';
import type { ParsedQuestao } from '../prova';

const questao = (numero: number, enunciado: string): ParsedQuestao => ({
  numero,
  enunciado,
  tipo: 'MULTIPLA_ESCOLHA',
  alternativas: null,
  gabarito: '?',
  explicacao: null,
});

describe('mergeQuestoes', () => {
  it('combines both sets and orders them by number', () => {
    const merged = mergeQuestoes([questao(93, 'det')], [questao(91, 'llm'), questao(92, 'llm')]);
    expect(merged.map((q) => q.numero)).toEqual([91, 92, 93]);
  });

  it('keeps the deterministic question when a number appears in both', () => {
    const merged = mergeQuestoes([questao(91, 'det')], [questao(91, 'llm')]);
    expect(merged).toHaveLength(1);
    expect(merged[0].enunciado).toBe('det');
  });
});
