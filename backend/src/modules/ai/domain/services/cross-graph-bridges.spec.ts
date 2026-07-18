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
  it('pairs concepts that live in different graphs', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(20))];

    const candidates = selectBridgeCandidates(inside, outside, new Set());

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      sourceId: 'a',
      targetId: 'b',
      targetGrafoNome: 'grafo-g2',
    });
    expect(candidates[0].similaridade).toBeGreaterThan(0.9);
  });

  it('ignores candidates that already share an edge, in either direction', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(5))];
    const existing = new Set([bridgePairKey('b', 'a')]);

    expect(selectBridgeCandidates(inside, outside, existing)).toEqual([]);
  });

  it('skips near-identical pairs, which are duplicates rather than bridges', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(0))];

    expect(selectBridgeCandidates(inside, outside, new Set())).toEqual([]);
    expect(NEAR_DUPLICATE_SIMILARITY).toBeLessThan(1);
  });

  // Regression: at the old 0.95 ceiling, "Criptografia simétrica" ↔ "assimétrica"
  // (0.966 measured) was discarded as a duplicate — it is one of the best bridges.
  it('keeps strongly related pairs that are not literally the same concept', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(15))]; // ~0.966

    expect(selectBridgeCandidates(inside, outside, new Set())).toHaveLength(1);
  });

  it('never bridges two nodes of the same graph', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g1', onCircle(20))];

    expect(selectBridgeCandidates(inside, outside, new Set())).toEqual([]);
  });

  it('returns the strongest pairs first, capped at the limit', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('far', 'g2', onCircle(40)), item('near', 'g2', onCircle(20))];

    const candidates = selectBridgeCandidates(inside, outside, new Set(), { limit: 1 });

    expect(candidates.map((c) => c.targetId)).toEqual(['near']);
  });

  it('keeps only the best pair per node, so one concept never floods the review', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b1', 'g2', onCircle(20)), item('b2', 'g2', onCircle(25))];

    const candidates = selectBridgeCandidates(inside, outside, new Set());

    expect(candidates.map((c) => c.targetId)).toEqual(['b1']);
  });

  // The point of the percentile: it adapts to whatever range the embedding model
  // produces. These vectors are all crowded above 0.9, as e5 actually behaves.
  it('cuts by the run own distribution, not by an absolute score', () => {
    const inside = Array.from({ length: 10 }, (_, i) => item(`a${i}`, 'g1', onCircle(i * 0.5)));
    const outside = Array.from({ length: 10 }, (_, i) =>
      item(`b${i}`, 'g2', onCircle(20 + i * 0.5)),
    );

    const candidates = selectBridgeCandidates(inside, outside, new Set(), { percentile: 0.99 });

    // 100 pairs, all above 0.9: the percentile keeps a handful, not all of them.
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThan(10);
  });

  it('keeps every pair when there are too few to form a distribution', () => {
    const inside = [item('a', 'g1', onCircle(0))];
    const outside = [item('b', 'g2', onCircle(70))]; // weak, but it is all there is

    expect(selectBridgeCandidates(inside, outside, new Set())).toHaveLength(1);
  });
});
