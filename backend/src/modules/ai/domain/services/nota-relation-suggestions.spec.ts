import { describe, it, expect } from 'vitest';
import {
  selectNotaRelations,
  MAX_NOTA_RELATIONS,
  type RelationCandidate,
} from './nota-relation-suggestions';

const cand = (id: string): RelationCandidate => ({
  id,
  tipo: 'CONCEITO',
  nome: `nome-${id}`,
  descricao: null,
});
const allowAll = (): boolean => true;

describe('selectNotaRelations', () => {
  it('maps a valid suggestion to a full suggestion', () => {
    const out = selectNotaRelations(
      [{ nodeId: 'c1', relacao: 'DEFINE', motivo: 'porque sim' }],
      [cand('c1')],
      allowAll,
    );
    expect(out).toEqual([
      {
        nodeId: 'c1',
        nodeTipo: 'CONCEITO',
        nodeNome: 'nome-c1',
        relacao: 'DEFINE',
        motivo: 'porque sim',
      },
    ]);
  });

  it('drops unknown nodes, disallowed relations and duplicates', () => {
    const out = selectNotaRelations(
      [
        { nodeId: 'ghost', relacao: 'DEFINE' },
        { nodeId: 'c1', relacao: 'NOPE' },
        { nodeId: 'c1', relacao: 'DEFINE' },
        { nodeId: 'c1', relacao: 'EXPLICA' },
      ],
      [cand('c1')],
      (_t, relacao) => relacao !== 'NOPE',
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.relacao).toBe('DEFINE');
  });

  it('defaults a non-string motivo to empty', () => {
    const out = selectNotaRelations([{ nodeId: 'c1', relacao: 'DEFINE' }], [cand('c1')], allowAll);
    expect(out[0]?.motivo).toBe('');
  });

  it('caps the number of suggestions', () => {
    const candidates = Array.from({ length: MAX_NOTA_RELATIONS + 3 }, (_, i) => cand(`c${i}`));
    const raw = candidates.map((c) => ({ nodeId: c.id, relacao: 'DEFINE' }));
    expect(selectNotaRelations(raw, candidates, allowAll)).toHaveLength(MAX_NOTA_RELATIONS);
  });
});
