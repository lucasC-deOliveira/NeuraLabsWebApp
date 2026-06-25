// The edge relation used when connecting a newly added prerequisite node to an
// existing target, by the (source, target) type pair. Returns null when the pair
// has no defined prerequisite relation.
export function prerequisiteRelation(sourceTipo: string, targetTipo: string): string | null {
  const pairs: Record<string, string> = {
    'CONCEITO→CONCEITO': 'PREREQUISITO',
    'CONCEITO→TOPICO': 'PERTENCE_A',
    'TOPICO→TOPICO': 'DEPENDE_DE',
    'TOPICO→ASSUNTO': 'PERTENCE_A',
  };
  return pairs[`${sourceTipo}→${targetTipo}`] ?? null;
}
