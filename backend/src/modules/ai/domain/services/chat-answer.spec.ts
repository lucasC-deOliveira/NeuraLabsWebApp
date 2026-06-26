import { describe, it, expect } from 'vitest';
import { extractChatAnswer, type ChatNode } from './chat-answer';

const nodes: ChatNode[] = [
  { id: 'c1', nome: 'Mitose', tipo: 'CONCEITO' },
  { id: 'c2', nome: 'Meiose', tipo: 'CONCEITO' },
];

describe('extractChatAnswer', () => {
  it('strips the referenced-ids line and resolves the nodes', () => {
    const content = 'A resposta em **Markdown**.\n{"referencedNodeIds":["c1","c2"]}';
    expect(extractChatAnswer(content, nodes)).toEqual({
      answer: 'A resposta em **Markdown**.',
      referencedNodes: [
        { id: 'c1', nome: 'Mitose', tipo: 'CONCEITO' },
        { id: 'c2', nome: 'Meiose', tipo: 'CONCEITO' },
      ],
    });
  });

  it('returns the whole content when there is no ids line', () => {
    expect(extractChatAnswer('Só a resposta.', nodes)).toEqual({
      answer: 'Só a resposta.',
      referencedNodes: [],
    });
  });

  it('ignores unknown ids', () => {
    const content = 'R\n{"referencedNodeIds":["c1","ghost"]}';
    expect(extractChatAnswer(content, nodes).referencedNodes.map((n) => n.id)).toEqual(['c1']);
  });

  it('returns empty for empty content', () => {
    expect(extractChatAnswer('', nodes)).toEqual({ answer: '', referencedNodes: [] });
  });

  it('keeps the answer when the ids line is malformed JSON', () => {
    const content = 'R final\n{"referencedNodeIds":[c1]}';
    const out = extractChatAnswer(content, nodes);
    expect(out.answer).toBe('R final');
    expect(out.referencedNodes).toEqual([]);
  });
});
