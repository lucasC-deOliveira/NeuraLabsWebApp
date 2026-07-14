// Abrevia contagens de tokens para exibição compacta (ex.: 1234 → "1.2k").
export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
