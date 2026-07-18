import { describe, it, expect } from 'vitest';
import {
  selectBridgeCandidates,
  bridgePairKey,
  NEAR_DUPLICATE_SIMILARITY,
  type BridgeItem,
} from './cross-graph-bridges';

function item(id: string, grafoId: string, vetor: number[]): BridgeItem {
  return { id, nome: `nome-${id}`, grafoId, grafoNome: `grafo-${grafoId}`, vetor };
}

// Unit vectors on a plane: the angle between them controls cosine similarity.
function onCircle(deg: number): number[] {
  const rad = (deg * Math.PI) / 180;
  return [Math.cos(rad), Math.sin(rad)];
}

describe('selectBridgeCandidates', () => {
  it('pairs similar concepts that live in different graphs', () => {
    // 20° apart: close enough to bridge, far enough not to be a duplicate.
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(20))];

    const candidates = selectBridgeCandidates(inside, outside, new Set(), 0.8, 10);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      sourceId: 'a',
      targetId: 'b',
      targetGrafoNome: 'grafo-g2',
    });
    expect(candidates[0].similaridade).toBeGreaterThan(0.9);
  });

  it('ignores pairs below the threshold', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(80))];

    expect(selectBridgeCandidates(inside, outside, new Set(), 0.8, 10)).toEqual([]);
  });

  it('ignores candidates that already share an edge, in either direction', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(5))];
    const existing = new Set([bridgePairKey('b', 'a')]);

    expect(selectBridgeCandidates(inside, outside, existing, 0.8, 10)).toEqual([]);
  });

  it('skips near-identical pairs, which are duplicates rather than bridges', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(0))];

    expect(selectBridgeCandidates(inside, outside, new Set(), 0.8, 10)).toEqual([]);
    expect(NEAR_DUPLICATE_SIMILARITY).toBeLessThan(1);
  });

  it('never bridges two nodes of the same graph', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g1', onCircle(10))];

    expect(selectBridgeCandidates(inside, outside, new Set(), 0.8, 10)).toEqual([]);
  });

  it('returns the strongest pairs first, capped at the limit', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('far', 'g2', onCircle(40)), item('near', 'g2', onCircle(20))];

    const candidates = selectBridgeCandidates(inside, outside, new Set(), 0.5, 1);

    expect(candidates.map((c) => c.targetId)).toEqual(['near']);
  });

  it('keeps only the best pair per node, so one concept never floods the review', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b1', 'g2', onCircle(20)), item('b2', 'g2', onCircle(25))];

    const candidates = selectBridgeCandidates(inside, outside, new Set(), 0.5, 10);

    expect(candidates.map((c) => c.targetId)).toEqual(['b1']);
  });
});
