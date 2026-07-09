import { describe, it, expect } from 'vitest';
import { prioritizeLearningPath, type PrereqLink } from './prioritize-learning-path';
import type { PathStep } from './learning-path';

const step = (nodeId: string): PathStep => ({
  nodeId,
  nome: nodeId,
  tipo: 'CONCEITO',
  motivo: '',
});

const imp = (entries: Array<[string, number]>): Map<string, number> => new Map(entries);

describe('prioritizeLearningPath', () => {
  it('orders by importance when there are no prerequisites', () => {
    const out = prioritizeLearningPath(
      [step('a'), step('b'), step('c')],
      [],
      imp([
        ['a', 1],
        ['b', 5],
        ['c', 3],
      ]),
    );
    expect(out.map((s) => s.nodeId)).toEqual(['b', 'c', 'a']);
  });

  it('never places a concept before its prerequisite, even if less important', () => {
    // c is the most important, but depends on a; a must come first.
    const prereqs: PrereqLink[] = [{ before: 'a', after: 'c' }];
    const out = prioritizeLearningPath(
      [step('a'), step('b'), step('c')],
      prereqs,
      imp([
        ['a', 1],
        ['b', 2],
        ['c', 9],
      ]),
    );
    expect(out.map((s) => s.nodeId)).toEqual(['b', 'a', 'c']);
    expect(out.findIndex((s) => s.nodeId === 'a')).toBeLessThan(
      out.findIndex((s) => s.nodeId === 'c'),
    );
  });

  it('keeps original order to break importance ties', () => {
    const out = prioritizeLearningPath(
      [step('x'), step('y')],
      [],
      imp([
        ['x', 4],
        ['y', 4],
      ]),
    );
    expect(out.map((s) => s.nodeId)).toEqual(['x', 'y']);
  });

  it('degrades gracefully on a prerequisite cycle (keeps everyone)', () => {
    const prereqs: PrereqLink[] = [
      { before: 'a', after: 'b' },
      { before: 'b', after: 'a' },
    ];
    const out = prioritizeLearningPath(
      [step('a'), step('b')],
      prereqs,
      imp([
        ['a', 1],
        ['b', 2],
      ]),
    );
    expect(out.map((s) => s.nodeId).sort()).toEqual(['a', 'b']);
  });
});
