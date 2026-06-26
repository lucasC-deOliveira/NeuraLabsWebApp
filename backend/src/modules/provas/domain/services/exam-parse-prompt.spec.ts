import { describe, it, expect } from 'vitest';
import { buildExamParsePrompt } from './exam-parse-prompt';

describe('buildExamParsePrompt', () => {
  it('embeds both texts under their section headers', () => {
    const [message] = buildExamParsePrompt('CONTEUDO PROVA', 'CONTEUDO GABARITO');
    expect(message.role).toBe('user');
    expect(message.content).toContain('=== PROVA ===\nCONTEUDO PROVA');
    expect(message.content).toContain('=== GABARITO ===\nCONTEUDO GABARITO');
  });

  it('truncates the prova to 12000 and the gabarito to 4000 chars', () => {
    const [message] = buildExamParsePrompt('p'.repeat(20000), 'g'.repeat(10000));
    expect(message.content).toContain('p'.repeat(12000));
    expect(message.content).not.toContain('p'.repeat(12001));
    expect(message.content).toContain('g'.repeat(4000));
    expect(message.content).not.toContain('g'.repeat(4001));
  });
});
