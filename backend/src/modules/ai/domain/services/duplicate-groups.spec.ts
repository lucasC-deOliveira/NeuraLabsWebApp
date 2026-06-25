import { describe, it, expect } from 'vitest';
import {
  selectDuplicateGroups,
  MAX_DUPLICATE_GROUPS,
  type DuplicateNode,
} from './duplicate-groups';

const node = (id: string, tipo: string): DuplicateNode => ({ id, nome: `n-${id}`, tipo });
const all = [node('a0', 'CONCEITO'), node('a1', 'CONCEITO'), node('a2', 'TOPICO')];

describe('selectDuplicateGroups', () => {
  it('resolves indices to nodes and keeps the suggestion', () => {
    const out = selectDuplicateGroups([{ indices: [0, 1], sugestao: 'manter [0]' }], all);
    expect(out).toEqual([
      { nodes: [node('a0', 'CONCEITO'), node('a1', 'CONCEITO')], sugestao: 'manter [0]' },
    ]);
  });

  it('drops groups with fewer than two nodes', () => {
    expect(selectDuplicateGroups([{ indices: [0] }], all)).toEqual([]);
  });

  it('drops groups mixing different types', () => {
    expect(selectDuplicateGroups([{ indices: [0, 2] }], all)).toEqual([]);
  });

  it('ignores out-of-range and non-numeric indices', () => {
    expect(selectDuplicateGroups([{ indices: [0, 99, 'x'] }], all)).toEqual([]);
  });

  it('defaults a missing suggestion to empty', () => {
    expect(selectDuplicateGroups([{ indices: [0, 1] }], all)[0]?.sugestao).toBe('');
  });

  it('caps the number of groups', () => {
    const raw = Array.from({ length: MAX_DUPLICATE_GROUPS + 2 }, () => ({ indices: [0, 1] }));
    expect(selectDuplicateGroups(raw, all)).toHaveLength(MAX_DUPLICATE_GROUPS);
  });
});
