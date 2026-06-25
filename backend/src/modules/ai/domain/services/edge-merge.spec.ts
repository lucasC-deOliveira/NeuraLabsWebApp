import { describe, it, expect } from 'vitest';
import { planEdgeMerge, type KeepEdge, type MergeEdge } from './edge-merge';

const edge = (
  id: string,
  nodeOrigemId: string | null,
  nodeDestinoId: string | null,
  tipoRelacao = 'REL',
): MergeEdge => ({ id, nodeOrigemId, nodeDestinoId, tipoRelacao });

describe('planEdgeMerge', () => {
  it('moves outgoing/incoming edges by their changed endpoint', () => {
    const del = [edge('e1', 'del', 'x'), edge('e2', 'y', 'del')];
    const plan = planEdgeMerge(del, [], 'del', 'keep');
    expect(plan.moveSrc).toEqual(['e1']);
    expect(plan.moveTgt).toEqual(['e2']);
    expect(plan.deleteIds).toEqual([]);
  });

  it('drops edges directly between the two nodes', () => {
    const del = [edge('e1', 'del', 'keep'), edge('e2', 'keep', 'del')];
    const plan = planEdgeMerge(del, [], 'del', 'keep');
    expect(plan.deleteIds).toEqual(['e1', 'e2']);
    expect(plan.moveSrc).toEqual([]);
    expect(plan.moveTgt).toEqual([]);
  });

  it('drops an edge whose rewired signature already exists on keep', () => {
    const keep: KeepEdge[] = [{ nodeOrigemId: 'keep', nodeDestinoId: 'x', tipoRelacao: 'REL' }];
    const plan = planEdgeMerge([edge('e1', 'del', 'x')], keep, 'del', 'keep');
    expect(plan.deleteIds).toEqual(['e1']);
    expect(plan.moveSrc).toEqual([]);
  });

  it('dedupes duplicate rewired edges within the same batch', () => {
    const del = [edge('e1', 'del', 'x'), edge('e2', 'del', 'x')];
    const plan = planEdgeMerge(del, [], 'del', 'keep');
    expect(plan.moveSrc).toEqual(['e1']);
    expect(plan.deleteIds).toEqual(['e2']);
  });
});
