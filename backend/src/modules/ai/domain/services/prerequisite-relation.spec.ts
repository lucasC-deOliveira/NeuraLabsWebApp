import { describe, it, expect } from 'vitest';
import { prerequisiteRelation } from './prerequisite-relation';

describe('prerequisiteRelation', () => {
  it('maps each defined type pair to its relation', () => {
    expect(prerequisiteRelation('CONCEITO', 'CONCEITO')).toBe('PREREQUISITO');
    expect(prerequisiteRelation('CONCEITO', 'TOPICO')).toBe('PERTENCE_A');
    expect(prerequisiteRelation('TOPICO', 'TOPICO')).toBe('DEPENDE_DE');
    expect(prerequisiteRelation('TOPICO', 'ASSUNTO')).toBe('PERTENCE_A');
  });

  it('returns null for undefined pairs', () => {
    expect(prerequisiteRelation('ASSUNTO', 'CONCEITO')).toBeNull();
    expect(prerequisiteRelation('CONCEITO', 'ASSUNTO')).toBeNull();
    expect(prerequisiteRelation('NOTA', 'CONCEITO')).toBeNull();
  });
});
