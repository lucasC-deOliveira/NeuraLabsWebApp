import { describe, it, expect } from 'vitest';
import { selectMissingPrerequisites, type PrereqNode } from './missing-prerequisites';

const nodes: PrereqNode[] = [
  { id: 't1', tipo: 'TOPICO', nome: 'Estruturas de Dados' },
  { id: 'c1', tipo: 'CONCEITO', nome: 'Recursão' },
];

describe('selectMissingPrerequisites', () => {
  it('resolves connections by exact name and defaults the type', () => {
    const out = selectMissingPrerequisites(
      [
        { nome: 'Lógica', motivo: 'base', shouldConnectTo: [{ nome: 'Recursão' }] },
        { nome: '  ', shouldConnectTo: [] },
      ],
      nodes,
    );
    expect(out).toEqual([
      {
        nome: 'Lógica',
        tipo: 'CONCEITO',
        motivo: 'base',
        shouldConnectTo: [{ id: 'c1', nome: 'Recursão' }],
      },
    ]);
  });

  it('keeps a valid explicit type and resolves by partial name', () => {
    const out = selectMissingPrerequisites(
      [{ nome: 'Arrays', tipo: 'TOPICO', shouldConnectTo: [{ nome: 'estruturas' }] }],
      nodes,
    );
    expect(out[0]?.tipo).toBe('TOPICO');
    expect(out[0]?.shouldConnectTo).toEqual([{ id: 't1', nome: 'Estruturas de Dados' }]);
  });

  it('caps the result at eight entries', () => {
    const raw = Array.from({ length: 12 }, (_, i) => ({ nome: `P${i}`, shouldConnectTo: [] }));
    expect(selectMissingPrerequisites(raw, nodes)).toHaveLength(8);
  });
});
