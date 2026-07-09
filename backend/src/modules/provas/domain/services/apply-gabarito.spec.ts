import { describe, it, expect } from 'vitest';
import { applyGabarito, gabaritoCovers } from './apply-gabarito';
import { ANNULLED } from './parse-gabarito';
import type { ParsedQuestao } from '../prova';

const questao = (numero: number): ParsedQuestao => ({
  numero,
  enunciado: `Q${numero}`,
  tipo: 'MULTIPLA_ESCOLHA',
  alternativas: [{ letra: 'A', texto: 'a' }],
  gabarito: '?',
  explicacao: null,
});

describe('applyGabarito', () => {
  it('fills each question with its answer-key letter', () => {
    const out = applyGabarito(
      [questao(91), questao(92)],
      new Map([
        [91, 'E'],
        [92, 'B'],
      ]),
    );
    expect(out.map((q) => q.gabarito)).toEqual(['E', 'B']);
  });

  it('marks annulled questions with the ANULADA sentinel (not left pending)', () => {
    const out = applyGabarito([questao(132)], new Map([[132, ANNULLED]]));
    expect(out[0].gabarito).toBe(ANNULLED);
    expect(out[0].gabarito).not.toBe('?');
  });
});

describe('gabaritoCovers', () => {
  it('is true only when every question has a key entry', () => {
    const qs = [questao(91), questao(92)];
    expect(
      gabaritoCovers(
        qs,
        new Map([
          [91, 'E'],
          [92, 'B'],
        ]),
      ),
    ).toBe(true);
    expect(gabaritoCovers(qs, new Map([[91, 'E']]))).toBe(false);
    expect(gabaritoCovers([], new Map([[91, 'E']]))).toBe(false);
  });
});
