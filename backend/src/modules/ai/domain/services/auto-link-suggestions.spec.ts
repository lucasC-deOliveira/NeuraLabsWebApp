import { describe, it, expect } from 'vitest';
import {
  selectAutoLinkSuggestions,
  MAX_AUTO_LINK_SUGGESTIONS,
  type AutoLinkNode,
} from './auto-link-suggestions';

const nodes: AutoLinkNode[] = [
  { id: 'c1', tipo: 'CONCEITO', nome: 'C1' },
  { id: 'c2', tipo: 'CONCEITO', nome: 'C2' },
  { id: 't1', tipo: 'TOPICO', nome: 'T1' },
];
const allowAll = (): boolean => true;
const noPairs = new Set<string>();

describe('selectAutoLinkSuggestions', () => {
  it('keeps a valid edge with resolved node names', () => {
    const out = selectAutoLinkSuggestions(
      [{ sourceId: 'c1', targetId: 'c2', relacao: 'IS_A', motivo: 'm' }],
      nodes,
      noPairs,
      allowAll,
    );
    expect(out).toEqual([
      {
        sourceId: 'c1',
        targetId: 'c2',
        sourceNome: 'C1',
        targetNome: 'C2',
        relacao: 'IS_A',
        motivo: 'm',
      },
    ]);
  });

  it('drops self-references, unknown nodes and disallowed relations', () => {
    const raw = [
      { sourceId: 'c1', targetId: 'c1', relacao: 'IS_A' },
      { sourceId: 'c1', targetId: 'ghost', relacao: 'IS_A' },
      { sourceId: 'c1', targetId: 't1', relacao: 'IS_A' },
    ];
    expect(selectAutoLinkSuggestions(raw, nodes, noPairs, (st, tt) => st === tt)).toEqual([]);
  });

  it('skips edges that already exist in either direction', () => {
    const existing = new Set(['c2:c1']);
    const raw = [{ sourceId: 'c1', targetId: 'c2', relacao: 'IS_A' }];
    expect(selectAutoLinkSuggestions(raw, nodes, existing, allowAll)).toEqual([]);
  });

  it('deduplicates the same pair+relation regardless of direction', () => {
    const raw = [
      { sourceId: 'c1', targetId: 'c2', relacao: 'IS_A' },
      { sourceId: 'c2', targetId: 'c1', relacao: 'IS_A' },
    ];
    expect(selectAutoLinkSuggestions(raw, nodes, noPairs, allowAll)).toHaveLength(1);
  });

  it('caps the number of suggestions', () => {
    const many: AutoLinkNode[] = Array.from({ length: 40 }, (_, i) => ({
      id: `n${i}`,
      tipo: 'CONCEITO',
      nome: `N${i}`,
    }));
    const raw = many.slice(1).map((n) => ({ sourceId: 'n0', targetId: n.id, relacao: 'IS_A' }));
    expect(selectAutoLinkSuggestions(raw, many, noPairs, allowAll)).toHaveLength(
      MAX_AUTO_LINK_SUGGESTIONS,
    );
  });
});
