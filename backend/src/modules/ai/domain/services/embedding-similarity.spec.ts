import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  similarityClusters,
  similarityRawGroups,
  type SimilarityItem,
} from './embedding-similarity';

describe('cosineSimilarity', () => {
  it('is 1 for identical directions and 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });

  it('is 0 (not NaN) when a vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

const item = (tipo: string, vetor: number[]): SimilarityItem => ({ tipo, vetor });

describe('similarityRawGroups', () => {
  it('groups same-type nodes above the threshold', () => {
    const groups = similarityRawGroups(
      [item('CONCEITO', [1, 0]), item('CONCEITO', [0.99, 0.14]), item('CONCEITO', [0, 1])],
      0.86,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].indices).toEqual([0, 1]);
    expect(groups[0].sugestao).toContain('similaridade');
  });

  it('never groups nodes of different types, even with identical vectors', () => {
    const groups = similarityRawGroups([item('TOPICO', [1, 0]), item('CONCEITO', [1, 0])], 0.86);
    expect(groups).toHaveLength(0);
  });

  it('unions transitively (A~B, B~C ⇒ one group of three)', () => {
    const groups = similarityRawGroups(
      [item('CONCEITO', [1, 0]), item('CONCEITO', [0.98, 0.2]), item('CONCEITO', [0.94, 0.34])],
      0.86,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].indices).toEqual([0, 1, 2]);
  });
});

describe('similarityClusters', () => {
  it('reports each cluster with its weakest pairwise similarity (minSim)', () => {
    const clusters = similarityClusters([item('CONCEITO', [1, 0]), item('CONCEITO', [0, 1])], 0.8);
    expect(clusters).toEqual([]); // orthogonal → no cluster
  });

  it('computes minSim as the weakest link of a transitive cluster', () => {
    const clusters = similarityClusters(
      [item('CONCEITO', [1, 0]), item('CONCEITO', [0.98, 0.2]), item('CONCEITO', [0.94, 0.34])],
      0.8,
    );
    expect(clusters).toHaveLength(1);
    // weakest pair is node0↔node2; minSim is below the strongest link.
    expect(clusters[0].minSim).toBeLessThan(1);
    expect(clusters[0].minSim).toBeGreaterThan(0.8);
  });
});
