import { describe, it, expect } from 'vitest';
import { mergeTrilha } from './roadmap-delta';
import type { PathStep } from './learning-path';

const step = (nodeId: string): PathStep => ({ nodeId, nome: nodeId, tipo: 'CONCEITO', motivo: '' });
const order = (...ids: string[]): PathStep[] => ids.map(step);
const ids = (steps: PathStep[]): string[] => steps.map((s) => s.nodeId);

describe('mergeTrilha', () => {
  it('keeps the persisted order and appends new items at their priority slot (end)', () => {
    const res = mergeTrilha(['b', 'a'], order('a', 'b', 'c', 'd'));
    expect(ids(res.itens)).toEqual(['b', 'a', 'c', 'd']);
    expect(res.novos).toBe(2);
  });

  it('inserts a new top-priority item before existing ones', () => {
    const res = mergeTrilha(['a', 'b'], order('x', 'a', 'b'));
    expect(ids(res.itens)).toEqual(['x', 'a', 'b']);
    expect(res.novos).toBe(1);
  });

  it('inserts a new mid-priority item at its position', () => {
    const res = mergeTrilha(['a', 'b'], order('a', 'm', 'b'));
    expect(ids(res.itens)).toEqual(['a', 'm', 'b']);
    expect(res.novos).toBe(1);
  });

  it('drops persisted items no longer present, without counting them as new', () => {
    const res = mergeTrilha(['a', 'b', 'c'], order('a', 'c'));
    expect(ids(res.itens)).toEqual(['a', 'c']);
    expect(res.novos).toBe(0);
  });

  it('treats an empty persisted trilha as all-new (equals full order)', () => {
    const res = mergeTrilha([], order('a', 'b', 'c'));
    expect(ids(res.itens)).toEqual(['a', 'b', 'c']);
    expect(res.novos).toBe(3);
  });
});
