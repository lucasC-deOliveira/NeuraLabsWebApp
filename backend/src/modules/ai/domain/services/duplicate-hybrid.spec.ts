import { describe, it, expect } from 'vitest';
import {
  partitionByConfidence,
  clusterSignature,
  shortlistNodes,
  attributeGroups,
  assembleGroups,
  HIGH_CONFIDENCE,
} from './duplicate-hybrid';
import type { SimilarityCluster } from './embedding-similarity';
import type { DuplicateGroup } from './duplicate-groups';

const node = (
  id: string,
  nome: string,
): { id: string; nome: string; tipo: string; desc: string } => ({
  id,
  nome,
  tipo: 'CONCEITO',
  desc: '',
});
const cluster = (indices: number[], minSim: number): SimilarityCluster => ({ indices, minSim });

describe('partitionByConfidence', () => {
  it('auto-accepts clusters whose weakest link clears the high bar', () => {
    const { autoAccept, uncertain } = partitionByConfidence(
      [cluster([0, 1], 0.97), cluster([2, 3], 0.88)],
      HIGH_CONFIDENCE,
    );
    expect(autoAccept.map((c) => c.indices)).toEqual([[0, 1]]);
    expect(uncertain.map((c) => c.indices)).toEqual([[2, 3]]);
  });
});

describe('clusterSignature', () => {
  const nodes = [node('n1', 'Pilha'), node('n2', 'Stack')];
  it('is stable regardless of index order', () => {
    expect(clusterSignature(cluster([0, 1], 0.9), nodes)).toBe(
      clusterSignature(cluster([1, 0], 0.9), nodes),
    );
  });
  it('changes when a member is renamed (forces re-judge)', () => {
    const renamed = [node('n1', 'Pilha'), node('n2', 'Fila')];
    expect(clusterSignature(cluster([0, 1], 0.9), nodes)).not.toBe(
      clusterSignature(cluster([0, 1], 0.9), renamed),
    );
  });
});

describe('shortlistNodes', () => {
  it('deduplicates nodes shared across clusters', () => {
    const nodes = [node('n1', 'A'), node('n2', 'B'), node('n3', 'C')];
    const out = shortlistNodes([cluster([0, 1], 0.9), cluster([1, 2], 0.9)], nodes);
    expect(out.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
  });
});

describe('attributeGroups', () => {
  it('maps confirmed groups to their cluster signature and caches negatives', () => {
    const idToSig = new Map([
      ['n1', 'sigA'],
      ['n2', 'sigA'],
      ['n3', 'sigB'],
      ['n4', 'sigB'],
    ]);
    const groups: DuplicateGroup[] = [
      {
        nodes: [
          { id: 'n1', nome: '', tipo: 'CONCEITO' },
          { id: 'n2', nome: '', tipo: 'CONCEITO' },
        ],
        sugestao: 'ok',
      },
    ];
    const map = attributeGroups(groups, idToSig, ['sigA', 'sigB']);
    expect(map.sigA[0].refIds).toEqual(['n1', 'n2']);
    expect(map.sigB).toEqual([]); // LLM found no duplicate → negative verdict cached
  });
});

describe('assembleGroups', () => {
  it('emits auto-accepted clusters plus each uncertain cluster verdict', () => {
    const nodes = [
      node('n1', 'Pilha'),
      node('n2', 'Stack'),
      node('n3', 'Vetor'),
      node('n4', 'Array'),
    ];
    const partition = { autoAccept: [cluster([0, 1], 0.97)], uncertain: [cluster([2, 3], 0.9)] };
    const sig = clusterSignature(cluster([2, 3], 0.9), nodes);
    const verdicts = { [sig]: [{ refIds: ['n3', 'n4'], sugestao: 'mesmo conceito' }] };
    const groups = assembleGroups(partition, verdicts, nodes);
    expect(groups.map((g) => g.nodes.map((n) => n.id))).toEqual([
      ['n1', 'n2'],
      ['n3', 'n4'],
    ]);
  });
});
