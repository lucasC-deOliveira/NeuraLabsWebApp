import { describe, it, expect } from 'vitest';
import {
  improveProvaQuestoesMessages,
  parseImprovedProvaQuestoes,
  type BatchQuestao,
} from './improve-questoes-batch';

const questoes: BatchQuestao[] = [
  {
    numero: 1,
    tipo: 'MULTIPLA_ESCOLHA',
    enunciado: 'q1',
    alternativas: [
      { letra: 'A', texto: 'a1' },
      { letra: 'B', texto: 'b1' },
    ],
    gabarito: 'B',
    explicacao: '',
  },
  {
    numero: 2,
    tipo: 'VERDADEIRO_FALSO',
    enunciado: 'q2',
    alternativas: [],
    gabarito: 'V',
    explicacao: '',
  },
];

describe('improveProvaQuestoesMessages', () => {
  it('sends the selected operation and all questions in one message', () => {
    const user = improveProvaQuestoesMessages(questoes, ['markdown'])[1].content;
    expect(user).toContain('Estilo Markdown');
    expect(user).toContain('"numero":1');
    expect(user).toContain('"numero":2');
  });
});

describe('parseImprovedProvaQuestoes', () => {
  it('matches by numero and preserves letters, keeping originals when missing', () => {
    const out = parseImprovedProvaQuestoes(
      {
        questoes: [
          {
            numero: 1,
            enunciado: '**q1**',
            alternativas: [
              { letra: 'B', texto: 'B1' },
              { letra: 'A', texto: 'A1' },
            ],
            explicacao: 'exp',
          },
          // questão 2 ausente → mantém original
        ],
      },
      questoes,
    );
    expect(out[0]).toEqual({
      numero: 1,
      enunciado: '**q1**',
      alternativas: [
        { letra: 'A', texto: 'A1' },
        { letra: 'B', texto: 'B1' },
      ],
      explicacao: 'exp',
    });
    expect(out[1]).toEqual({ numero: 2, enunciado: 'q2', alternativas: [], explicacao: '' });
  });
});
