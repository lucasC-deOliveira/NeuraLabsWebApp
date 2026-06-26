import { describe, it, expect } from 'vitest';
import {
  baralhoFlashcardPairs,
  clampPeso,
  planVaultEdges,
  refsToRemove,
  type GraphNodeRef,
  type VaultEdge,
} from './vault-sync';

describe('clampPeso', () => {
  it('keeps a weight inside (0, 2]', () => {
    expect(clampPeso(1.5)).toBe(1.5);
    expect(clampPeso(2)).toBe(2);
  });

  it('falls back to 1 for missing or out-of-range weights', () => {
    expect(clampPeso(undefined)).toBe(1);
    expect(clampPeso(0)).toBe(1);
    expect(clampPeso(3)).toBe(1);
    expect(clampPeso(Number.NaN)).toBe(1);
  });
});

describe('refsToRemove', () => {
  it('returns ids whose ref is absent from the vault', () => {
    const current = [
      { id: 'n1', referenciaId: 'a' },
      { id: 'n2', referenciaId: 'b' },
    ];
    expect(refsToRemove(current, new Set(['a']))).toEqual(['n2']);
  });
});

const ref = (id: string, referenciaId: string, tipoNode: string): GraphNodeRef => ({
  id,
  referenciaId,
  tipoNode,
});
const byRef = (...rows: GraphNodeRef[]): Map<string, GraphNodeRef> =>
  new Map(rows.map((r) => [r.referenciaId, r]));

describe('planVaultEdges', () => {
  const map = byRef(ref('na', 'a', 'CONCEITO'), ref('nb', 'b', 'CONCEITO'));

  it('plans allowed edges with a clamped weight', () => {
    const edges: VaultEdge[] = [{ origem: 'a', destino: 'b', relacao: 'PREREQUISITO', peso: 9 }];
    expect(planVaultEdges(edges, map)).toEqual([
      { nodeOrigemId: 'na', nodeDestinoId: 'nb', relacao: 'PREREQUISITO', peso: 1 },
    ]);
  });

  it('drops self-loops, unknown endpoints, disallowed and duplicate edges', () => {
    const edges: VaultEdge[] = [
      { origem: 'a', destino: 'a', relacao: 'PREREQUISITO' },
      { origem: 'a', destino: 'z', relacao: 'PREREQUISITO' },
      { origem: 'a', destino: 'b', relacao: 'CONTEM' },
      { origem: 'a', destino: 'b', relacao: 'PREREQUISITO' },
      { origem: 'a', destino: 'b', relacao: 'PREREQUISITO' },
    ];
    expect(planVaultEdges(edges, map)).toHaveLength(1);
  });
});

describe('baralhoFlashcardPairs', () => {
  it('groups CONTEM edges from a deck to its flashcards', () => {
    const map = byRef(ref('nb', 'deck', 'BARALHO'), ref('nf', 'fc', 'FLASHCARD'));
    const edges: VaultEdge[] = [
      { origem: 'deck', destino: 'fc', relacao: 'CONTEM' },
      { origem: 'deck', destino: 'fc2', relacao: 'CONTEM' },
    ];
    expect(baralhoFlashcardPairs(edges, map)).toEqual([{ baralhoRef: 'deck', fcRefs: ['fc'] }]);
  });
});
