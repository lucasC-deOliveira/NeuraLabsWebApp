import { describe, it, expect } from 'vitest';
import { buildQuestaoConceitoLinks } from './build-questao-conceito-links';
import type { ParsedQuestao } from '../prova';

const questao = (numero: number, conceitos?: ParsedQuestao['conceitos']): ParsedQuestao => ({
  numero,
  enunciado: `Q${numero}`,
  tipo: 'MULTIPLA_ESCOLHA',
  alternativas: null,
  gabarito: '?',
  explicacao: null,
  conceitos,
});

describe('buildQuestaoConceitoLinks', () => {
  it('pairs each question id with its confirmed concepts, in order', () => {
    const questoes = [
      questao(91, [{ nome: 'Esterificação', conceitoId: 'c1' }]),
      questao(92, [{ nome: 'Cinética', conceitoId: null }]),
    ];
    const links = buildQuestaoConceitoLinks(questoes, ['q-a', 'q-b']);
    expect(links).toEqual([
      { questaoId: 'q-a', conceitos: [{ nome: 'Esterificação', conceitoId: 'c1' }] },
      { questaoId: 'q-b', conceitos: [{ nome: 'Cinética', conceitoId: null }] },
    ]);
  });

  it('drops questions with no concepts', () => {
    const links = buildQuestaoConceitoLinks([questao(91), questao(92, [])], ['q-a', 'q-b']);
    expect(links).toEqual([]);
  });
});
