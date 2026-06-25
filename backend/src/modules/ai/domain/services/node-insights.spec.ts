import { describe, it, expect } from 'vitest';
import { selectNodeInsights, MAX_NODE_INSIGHTS, type RawInsight } from './node-insights';

const allowAll = (): boolean => true;
const combo = { tipoNo: 'CONCEITO', relacao: 'PREREQUISITO' };

describe('selectNodeInsights', () => {
  it('keeps a valid insight with its allowed combo', () => {
    const raw: RawInsight[] = [
      { categoria: 'Aprofundar', titulo: ' T ', descricao: ' D ', tipoNo: 'TOPICO', relacao: 'X' },
    ];
    expect(selectNodeInsights(raw, null, allowAll)).toEqual([
      { categoria: 'Aprofundar', titulo: 'T', descricao: 'D', tipoNo: 'TOPICO', relacao: 'X' },
    ]);
  });

  it('drops insights without a title', () => {
    expect(selectNodeInsights([{ titulo: '  ' }], combo, allowAll)).toEqual([]);
  });

  it('normalizes an unknown category to "Relacionado"', () => {
    const raw: RawInsight[] = [{ titulo: 'T', categoria: 'Nope', tipoNo: 'A', relacao: 'R' }];
    expect(selectNodeInsights(raw, null, allowAll)[0]?.categoria).toBe('Relacionado');
  });

  it('falls back to the default combo when the suggested one is not allowed', () => {
    const raw: RawInsight[] = [{ titulo: 'T', tipoNo: 'BAD', relacao: 'BAD' }];
    const out = selectNodeInsights(raw, combo, () => false);
    expect(out[0]).toMatchObject(combo);
  });

  it('drops the insight when not allowed and there is no default combo', () => {
    const raw: RawInsight[] = [{ titulo: 'T', tipoNo: 'BAD', relacao: 'BAD' }];
    expect(selectNodeInsights(raw, null, () => false)).toEqual([]);
  });

  it('caps the number of insights', () => {
    const raw: RawInsight[] = Array.from({ length: MAX_NODE_INSIGHTS + 2 }, () => ({
      titulo: 'T',
      tipoNo: 'A',
      relacao: 'R',
    }));
    expect(selectNodeInsights(raw, null, allowAll)).toHaveLength(MAX_NODE_INSIGHTS);
  });
});
