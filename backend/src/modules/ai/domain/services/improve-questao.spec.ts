import { describe, it, expect } from 'vitest';
import {
  improveQuestaoMessages,
  improveQuestaoMaxTokens,
  parseImprovedQuestao,
  type QuestaoContent,
} from './improve-questao';

const content: QuestaoContent = {
  tipo: 'MULTIPLA_ESCOLHA',
  enunciado: 'qual e a capital',
  alternativas: [
    { letra: 'A', texto: 'sao paulo' },
    { letra: 'B', texto: 'brasilia' },
  ],
  gabarito: 'B',
  explicacao: 'brasilia e a capital',
};

describe('improveQuestaoMessages', () => {
  it('sends only the selected operation and the whole question', () => {
    const user = improveQuestaoMessages(content, ['markdown'])[1].content;
    expect(user).toContain('Estilo Markdown');
    expect(user).not.toContain('Formatação e estrutura');
    expect(user).toContain('"gabarito":"B"'); // gabarito vai como contexto (não muda)
    expect(user).toContain('brasilia');
  });
});

describe('improveQuestaoMaxTokens', () => {
  it('scales with content length but stays capped', () => {
    expect(
      improveQuestaoMaxTokens({ ...content, enunciado: '', explicacao: '', alternativas: [] }),
    ).toBe(500);
    const huge = { ...content, enunciado: 'a'.repeat(9999), explicacao: 'a'.repeat(9999) };
    expect(improveQuestaoMaxTokens(huge)).toBe(2500);
  });
});

describe('parseImprovedQuestao', () => {
  it('replaces texts but preserves letters, order and count (gabarito stays valid)', () => {
    const out = parseImprovedQuestao(
      {
        enunciado: 'Qual é a **capital**?',
        alternativas: [
          { letra: 'B', texto: 'Brasília' }, // fora de ordem e só uma
          { letra: 'A', texto: 'São Paulo' },
        ],
        explicacao: 'Brasília é a capital.',
      },
      content,
    );
    expect(out.alternativas).toEqual([
      { letra: 'A', texto: 'São Paulo' },
      { letra: 'B', texto: 'Brasília' },
    ]);
    expect(out.enunciado).toBe('Qual é a **capital**?');
  });

  it('keeps an original alternativa when the model drops or blanks it', () => {
    const out = parseImprovedQuestao({ alternativas: [{ letra: 'A', texto: '  ' }] }, content);
    expect(out.alternativas).toEqual(content.alternativas); // nada trocado
    expect(out.enunciado).toBe(content.enunciado); // enunciado omitido → original
  });
});
