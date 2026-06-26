import { describe, it, expect } from 'vitest';
import { selectLearningPath, type PathNode } from './learning-path';

const nodes: PathNode[] = [
  { id: 'c1', nome: 'Mitose', tipo: 'CONCEITO' },
  { id: 'c2', nome: 'Meiose', tipo: 'CONCEITO' },
];

describe('selectLearningPath', () => {
  it('resolves a step by exact (case-insensitive) name', () => {
    const out = selectLearningPath([{ nome: ' mitose ', motivo: 'comece aqui' }], nodes);
    expect(out).toEqual([
      { nodeId: 'c1', nome: 'Mitose', tipo: 'CONCEITO', motivo: 'comece aqui' },
    ]);
  });

  it('falls back to nodeId when the name does not match', () => {
    expect(selectLearningPath([{ nome: 'desconhecido', nodeId: 'c2' }], nodes)[0]?.nodeId).toBe(
      'c2',
    );
  });

  it('falls back to a partial name match', () => {
    expect(selectLearningPath([{ nome: 'estudo de Mitose celular' }], nodes)[0]?.nodeId).toBe('c1');
  });

  it('drops unresolved and duplicate steps', () => {
    const out = selectLearningPath(
      [{ nome: 'Mitose' }, { nome: 'Mitose' }, { nome: 'inexistente xyz' }],
      nodes,
    );
    expect(out.map((s) => s.nodeId)).toEqual(['c1']);
  });

  it('defaults a missing motivo to empty', () => {
    expect(selectLearningPath([{ nome: 'Mitose' }], nodes)[0]?.motivo).toBe('');
  });
});
