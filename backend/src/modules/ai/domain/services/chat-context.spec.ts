import { describe, it, expect } from 'vitest';
import { buildChatContext, type ChatContextNode } from './chat-context';

describe('buildChatContext', () => {
  it('prefixes each node with its id and truncates by type', () => {
    const nodes: ChatContextNode[] = [
      { id: 't1', tipo: 'TOPICO', nome: 'Árvores', corpo: 'estruturas' },
      { id: 'c1', tipo: 'CONCEITO', nome: 'Heap', corpo: null },
    ];
    expect(buildChatContext(nodes)).toBe('[TÓPICO:t1] Árvores: estruturas\n\n[CONCEITO:c1] Heap');
  });

  it('always shows the body and a fallback name for NOTA', () => {
    expect(buildChatContext([{ id: 'n1', tipo: 'NOTA', nome: '', corpo: null }])).toBe(
      '[NOTA:n1] Nota: ',
    );
  });
});
