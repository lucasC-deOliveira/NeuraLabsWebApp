import { describe, it, expect } from 'vitest';
import {
  buildStudyAidMessages,
  parseStudyAid,
  studyAidMaxTokens,
  type StudyAidMode,
} from './study-aid-prompt';

const card = { pergunta: 'Qual a capital da França?', resposta: 'Paris', conceito: 'Geografia' };

function systemOf(mode: StudyAidMode): string {
  return buildStudyAidMessages(mode, card).find((m) => m.role === 'system')?.content ?? '';
}

describe('buildStudyAidMessages', () => {
  it('tells the hint NOT to reveal the answer — that is the whole point of a hint', () => {
    const system = systemOf('hint');

    expect(system.toLowerCase()).toContain('não revele');
    // A resposta não vai no prompt da dica: o modelo não pode vazar o que não tem.
    const user = buildStudyAidMessages('hint', card).find((m) => m.role === 'user')?.content ?? '';
    expect(user).not.toContain('Paris');
    expect(user).toContain('Qual a capital da França?');
  });

  // O mnemônico ajuda a FIXAR a resposta, então precisa dela — ao contrário da dica.
  it('gives the mnemonic both sides, since it memorizes the answer', () => {
    const user =
      buildStudyAidMessages('mnemonic', card).find((m) => m.role === 'user')?.content ?? '';

    expect(user).toContain('Paris');
    expect(user).toContain('Qual a capital da França?');
  });

  it('rejects an unknown mode with the offending value', () => {
    expect(() => buildStudyAidMessages('x' as StudyAidMode, card)).toThrow(/"x".*hint|mnemonic/);
  });
});

describe('parseStudyAid', () => {
  it('extracts the text from the model JSON', () => {
    expect(parseStudyAid('{"texto":"Pense na Torre Eiffel."}')).toBe('Pense na Torre Eiffel.');
  });

  it('trims and survives surrounding prose around the JSON', () => {
    expect(parseStudyAid('Claro! {"texto":"Dica aqui"} espero ajudar')).toBe('Dica aqui');
  });

  it('returns empty string when the model gives nothing usable', () => {
    expect(parseStudyAid('sem json aqui')).toBe('');
    expect(parseStudyAid('{"texto":123}')).toBe('');
  });
});

describe('studyAidMaxTokens', () => {
  it('keeps hints and mnemonics short — they are one line, not an essay', () => {
    expect(studyAidMaxTokens()).toBeLessThanOrEqual(300);
  });
});
