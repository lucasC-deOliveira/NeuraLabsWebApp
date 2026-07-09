import { describe, it, expect } from 'vitest';
import { buildConceitoClassificationPrompt } from './build-conceito-classification-prompt';
import { resolveConceitoSuggestions } from './resolve-conceito-suggestions';
import type { CatalogoConceitos, ParsedQuestao } from '../prova';

const catalogo: CatalogoConceitos = {
  assuntos: [],
  topicos: [],
  conceitos: [{ id: 'c1', nome: 'Esterificação' }],
};

const questao = (numero: number, enunciado: string): ParsedQuestao => ({
  numero,
  enunciado,
  tipo: 'MULTIPLA_ESCOLHA',
  alternativas: null,
  gabarito: '?',
  explicacao: null,
});

describe('buildConceitoClassificationPrompt', () => {
  it('includes the existing catalog and each question by number', () => {
    const [message] = buildConceitoClassificationPrompt(
      [questao(91, 'Sobre esterificação de ácidos'), questao(92, 'Cinética química')],
      catalogo,
    );
    expect(message.content).toContain('Esterificação');
    expect(message.content).toContain('91');
    expect(message.content).toContain('92');
    expect(message.content).toContain('esterificação de ácidos');
  });

  it('truncates long stems to bound tokens', () => {
    const [message] = buildConceitoClassificationPrompt([questao(1, 'x'.repeat(1000))], catalogo);
    expect(message.content.length).toBeLessThan(1000);
  });
});

describe('resolveConceitoSuggestions', () => {
  it('resolves existing names to their id and marks new ones as null', () => {
    const raw =
      '{"questoes":[{"numero":91,"conceitos":["Esterificação","Craqueamento de alcanos"]}]}';
    const [q91] = resolveConceitoSuggestions(raw, catalogo);
    expect(q91.numero).toBe(91);
    expect(q91.conceitos).toEqual([
      { nome: 'Esterificação', conceitoId: 'c1' },
      { nome: 'Craqueamento de alcanos', conceitoId: null },
    ]);
  });

  it('matches existing names case-insensitively', () => {
    const [q] = resolveConceitoSuggestions(
      '{"questoes":[{"numero":1,"conceitos":["ESTERIFICAÇÃO"]}]}',
      catalogo,
    );
    expect(q.conceitos[0].conceitoId).toBe('c1');
  });

  it('drops empty and duplicate concept names', () => {
    const [q] = resolveConceitoSuggestions(
      '{"questoes":[{"numero":1,"conceitos":["Esterificação","esterificação",""," "]}]}',
      catalogo,
    );
    expect(q.conceitos).toHaveLength(1);
  });

  it('returns an empty list when the model returns no questions', () => {
    expect(resolveConceitoSuggestions('{}', catalogo)).toEqual([]);
  });
});
