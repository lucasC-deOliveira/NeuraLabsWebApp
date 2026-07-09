import { describe, it, expect } from 'vitest';
import { conceitoNameIndex, catalogoPromptFragment } from './conceito-catalog';
import type { CatalogoConceitos } from '../prova';

const catalogo: CatalogoConceitos = {
  assuntos: [{ id: 'a1', nome: 'Química' }],
  topicos: [{ id: 't1', nome: 'Reações orgânicas' }],
  conceitos: [
    { id: 'c1', nome: 'Esterificação' },
    { id: 'c2', nome: 'Descarboxilação' },
  ],
};

describe('conceitoNameIndex', () => {
  it('maps concept names (case-insensitive) to their ids', () => {
    const index = conceitoNameIndex(catalogo);
    expect(index.get('esterificação')).toBe('c1');
    expect(index.get('DESCARBOXILAÇÃO'.toLowerCase())).toBe('c2');
    expect(index.get('inexistente')).toBeUndefined();
  });
});

describe('catalogoPromptFragment', () => {
  it('lists the existing nodes so the model reuses them', () => {
    const fragment = catalogoPromptFragment(catalogo);
    expect(fragment).toContain('Esterificação');
    expect(fragment).toContain('Reações orgânicas');
    expect(fragment).toContain('Química');
  });

  it('is empty when the graph has no nodes', () => {
    expect(catalogoPromptFragment({ assuntos: [], topicos: [], conceitos: [] })).toBe('');
  });
});
