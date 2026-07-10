import { describe, it, expect } from 'vitest';
import { normalizeNodeName, nodeNameKey } from './node-name-key';

describe('normalizeNodeName', () => {
  it('lowercases and strips accents', () => {
    expect(normalizeNodeName('Análise Sintática')).toBe('analise sintatica');
    expect(normalizeNodeName('CONCORDÂNCIA')).toBe('concordancia');
  });

  it('collapses and trims whitespace', () => {
    expect(normalizeNodeName('  Coesão   textual ')).toBe('coesao textual');
  });

  it('folds accent/case/spacing variants of the same name together', () => {
    expect(normalizeNodeName('Análise sintática')).toBe(normalizeNodeName('analise  Sintatica'));
  });

  it('keeps genuinely different names distinct (punctuation is preserved)', () => {
    expect(normalizeNodeName('C++')).not.toBe(normalizeNodeName('C'));
    expect(normalizeNodeName('C#')).not.toBe(normalizeNodeName('C++'));
    // subset names are NOT the same concept, so they must not collapse
    expect(normalizeNodeName('Concordância verbal')).not.toBe(
      normalizeNodeName('Concordância verbal e nominal'),
    );
  });
});

describe('nodeNameKey', () => {
  it('namespaces the normalized name by node type', () => {
    expect(nodeNameKey('CONCEITO', 'Célula')).toBe('CONCEITO|celula');
  });

  it('does not fold names of different types together', () => {
    expect(nodeNameKey('TOPICO', 'Célula')).not.toBe(nodeNameKey('CONCEITO', 'Célula'));
  });
});
