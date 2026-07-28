// Rótulo amigável da chave de uma trilha de roadmap. A chave dobra o escopo:
// "ai" | "prova" | "edital" | "prova_edital" (+ "|p:<provaId>" e/ou "|e:<editalId>").
// É o que o usuário escolhe como ESCOPO do plano — a prioridade + qual prova/edital.

const BASE_LABELS: Record<string, string> = {
  ai: 'Prioridade da IA',
  prova: 'O que mais cai na prova',
  edital: 'Ênfase do edital',
  prova_edital: 'Prova + edital',
};

// Os ids de prova/edital embutidos na chave (para o adapter resolver os títulos).
export function roadmapScopeIds(modo: string): { provaId?: string; editalId?: string } {
  const parts = modo.split('|');
  return {
    provaId: parts.find((p) => p.startsWith('p:'))?.slice(2),
    editalId: parts.find((p) => p.startsWith('e:'))?.slice(2),
  };
}

/**
 * Rótulo do roadmap: a prioridade-base + os títulos do escopo, quando houver.
 * @example roadmapLabel('prova|p:x', new Map([['x','TRF 2026']])) // "O que mais cai na prova: TRF 2026"
 */
export function roadmapLabel(modo: string, names: Map<string, string>): string {
  const base = modo.split('|')[0];
  const { provaId, editalId } = roadmapScopeIds(modo);
  const scope = [provaId, editalId]
    .map((id) => (id ? names.get(id) : undefined))
    .filter((n): n is string => Boolean(n));
  const baseLabel = BASE_LABELS[base] ?? base;
  return scope.length > 0 ? `${baseLabel}: ${scope.join(' / ')}` : baseLabel;
}
