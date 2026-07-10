import { describe, it, expect } from 'vitest';
import { buildNameIndex, type NamedNode } from './name-index';

const node = (id: string, nome: string): NamedNode => ({ id, nome });

describe('buildNameIndex', () => {
  it('indexes every node and lists each group in the context', () => {
    const { nameIndex, existingContext } = buildNameIndex(
      [node('a1', 'Biologia')],
      [node('t1', 'Célula')],
      [node('c1', 'Mitose')],
    );
    // keys are accent-folded (see node-name-key): "Célula" → "topico|celula".
    expect(nameIndex.get('ASSUNTO|biologia')).toBe('a1');
    expect(nameIndex.get('TOPICO|celula')).toBe('t1');
    expect(nameIndex.get('CONCEITO|mitose')).toBe('c1');
    expect(existingContext).toContain('ASSUNTOs existentes: "Biologia"');
    expect(existingContext).toContain('TÓPICOs existentes: "Célula"');
    expect(existingContext).toContain('CONCEITOs existentes: "Mitose"');
  });

  it('returns an empty context when there are no nodes', () => {
    const { nameIndex, existingContext } = buildNameIndex([], [], []);
    expect(nameIndex.size).toBe(0);
    expect(existingContext).toBe('');
  });

  it('indexes all concepts but caps the listed names at 50', () => {
    const conceitos = Array.from({ length: 60 }, (_, i) => node(`c${i}`, `C${i}`));
    const { nameIndex, existingContext } = buildNameIndex([], [], conceitos);
    expect(nameIndex.size).toBe(60);
    expect(existingContext).toContain('"C49"');
    expect(existingContext).not.toContain('"C50"');
  });
});
