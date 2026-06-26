import { describe, it, expect } from 'vitest';
import { buildClusterContext, type ClusterNode } from './cluster-context';

describe('buildClusterContext', () => {
  it('labels each node and appends the body only when present (non-NOTA)', () => {
    const nodes: ClusterNode[] = [
      { tipo: 'ASSUNTO', nome: 'Bio', corpo: 'estudo da vida' },
      { tipo: 'CONCEITO', nome: 'Mitose', corpo: null },
    ];
    expect(buildClusterContext(nodes)).toBe('[ASSUNTO] Bio: estudo da vida\n\n[CONCEITO] Mitose');
  });

  it('always shows the colon and a fallback name for NOTA', () => {
    const nodes: ClusterNode[] = [{ tipo: 'NOTA', nome: '', corpo: null }];
    expect(buildClusterContext(nodes)).toBe('[NOTA] Nota: ');
  });

  it('truncates the body to the type-specific length', () => {
    const long = 'x'.repeat(300);
    const out = buildClusterContext([{ tipo: 'TOPICO', nome: 'T', corpo: long }]);
    expect(out).toBe(`[TÓPICO] T: ${'x'.repeat(150)}`);
  });
});
