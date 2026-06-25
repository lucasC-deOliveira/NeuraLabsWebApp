import { describe, it, expect } from 'vitest';
import { parseClusterSummary } from './cluster-summary';

describe('parseClusterSummary', () => {
  it('keeps valid string fields', () => {
    expect(parseClusterSummary({ titulo: 'T', resumo: 'R' })).toEqual({ titulo: 'T', resumo: 'R' });
  });

  it('applies defaults for missing or non-string fields', () => {
    expect(parseClusterSummary({ titulo: 5 })).toEqual({ titulo: 'Resumo do cluster', resumo: '' });
    expect(parseClusterSummary(null)).toEqual({ titulo: 'Resumo do cluster', resumo: '' });
  });
});
