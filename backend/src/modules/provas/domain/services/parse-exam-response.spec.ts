import { describe, it, expect } from 'vitest';
import { parseExamResponse } from './parse-exam-response';
import { InvalidExamJsonError } from '../errors';

describe('parseExamResponse', () => {
  it('parses raw JSON and normalizes a multiple-choice question', () => {
    const raw = JSON.stringify({
      tituloSugerido: 'Prova X',
      questoes: [
        {
          numero: 1,
          enunciado: '  Qual?  ',
          tipo: 'MULTIPLA_ESCOLHA',
          alternativas: [{ letra: 'a', texto: 'A' }],
          gabarito: 'c',
          explicacao: null,
        },
      ],
    });
    const result = parseExamResponse(raw);
    expect(result.tituloSugerido).toBe('Prova X');
    expect(result.questoes[0]).toEqual({
      numero: 1,
      enunciado: 'Qual?',
      tipo: 'MULTIPLA_ESCOLHA',
      alternativas: [{ letra: 'a', texto: 'A' }],
      gabarito: 'C',
      explicacao: null,
    });
  });

  it('extracts JSON wrapped in a markdown fence', () => {
    const raw =
      '```json\n{"questoes":[{"enunciado":"E","tipo":"VERDADEIRO_FALSO","gabarito":"v"}]}\n```';
    const result = parseExamResponse(raw);
    expect(result.questoes).toHaveLength(1);
    expect(result.questoes[0].gabarito).toBe('V');
  });

  it('defaults numero, tipo, gabarito and drops empty enunciados', () => {
    const raw = JSON.stringify({
      questoes: [{ enunciado: '' }, { enunciado: 'Real', tipo: 'OUTRO' }],
    });
    const result = parseExamResponse(raw);
    expect(result.questoes).toHaveLength(1);
    // numero reflects the original array index (2), preserved across the filter
    expect(result.questoes[0]).toMatchObject({
      numero: 2,
      tipo: 'MULTIPLA_ESCOLHA',
      gabarito: '?',
      alternativas: null,
    });
  });

  it('treats an empty alternativas array as null', () => {
    const raw = JSON.stringify({ questoes: [{ enunciado: 'E', alternativas: [] }] });
    expect(parseExamResponse(raw).questoes[0].alternativas).toBeNull();
  });

  it('returns null tituloSugerido when blank or missing', () => {
    expect(parseExamResponse('{"questoes":[]}').tituloSugerido).toBeNull();
    expect(parseExamResponse('{"tituloSugerido":"  ","questoes":[]}').tituloSugerido).toBeNull();
  });

  it('throws InvalidExamJsonError on unparseable output', () => {
    expect(() => parseExamResponse('not json at all')).toThrow(InvalidExamJsonError);
  });
});
