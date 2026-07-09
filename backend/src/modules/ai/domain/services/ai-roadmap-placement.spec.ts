import { describe, it, expect } from 'vitest';
import { applyPlacements } from './ai-roadmap-placement';
import type { PathStep } from './learning-path';

const step = (nodeId: string): PathStep => ({ nodeId, nome: nodeId, tipo: 'CONCEITO', motivo: '' });
const ids = (steps: PathStep[]): string[] => steps.map((s) => s.nodeId);

describe('applyPlacements', () => {
  it('inserts a new step right after its anchor', () => {
    const res = applyPlacements([step('a'), step('b')], [step('x')], new Map([['x', 'a']]));
    expect(ids(res)).toEqual(['a', 'x', 'b']);
  });

  it('appends when the anchor is null or unknown', () => {
    const res = applyPlacements(
      [step('a'), step('b')],
      [step('x'), step('y')],
      new Map<string, string | null>([
        ['x', null],
        ['y', 'zzz'],
      ]),
    );
    expect(ids(res)).toEqual(['a', 'b', 'x', 'y']);
  });

  it('places multiple new steps relative to their anchors', () => {
    const res = applyPlacements(
      [step('a'), step('b')],
      [step('x'), step('y')],
      new Map([
        ['x', 'a'],
        ['y', 'b'],
      ]),
    );
    expect(ids(res)).toEqual(['a', 'x', 'b', 'y']);
  });
});
