// Priority weight of an assunto tag, derived from the connections of its ASSUNTO
// node in the graph. Honors BOTH the connection count and the connection type:
// structural/hierarchical links (contains, is-a, prerequisite) signal a more
// central assunto than loose associative ones (related-to, references).
//
// Kept prisma-free (string keys) so it stays in the pure domain layer.

// Tier multiplier by relation type. Higher tier ⇒ a link that anchors the assunto
// more strongly in the graph's structure.
const TIER: Record<string, number> = {
  // estrutural / hierárquico
  CONTEM: 3,
  PART_OF: 3,
  IS_A: 3,
  PERTENCE_A: 3,
  SUBTOPICO_DE: 3,
  HERDA: 3,
  COBRE: 3,
  REGE: 3,
  // dependência / aprendizado
  PREREQUISITO: 2,
  DEPENDE_DE: 2,
  FUNDAMENTA: 2,
  DERIVA_DE: 2,
  EVOLUI_PARA: 2,
  // conteúdo / avaliação
  DEFINE: 1.5,
  EXPLICA: 1.5,
  APROFUNDA: 1.5,
  GERA: 1.5,
  SINTETIZA: 1.5,
  TESTA: 1.5,
  TESTA_DEFINICAO: 1.5,
  APLICADO_EM: 1.5,
  OBJETIVO_DE: 1.5,
  MEDIDO_POR: 1.5,
  EXEMPLIFICA: 1.5,
};

// Fallback tier for associative / weak relations (RELACIONADO, REFERENCIA, ...).
const ASSOCIATIVE_TIER = 1;

/**
 * Tier multiplier of a relation type. Unlisted types fall back to the associative
 * (weakest) tier.
 * @example relationTier('CONTEM') // 3
 */
export function relationTier(tipoRelacao: string): number {
  return TIER[tipoRelacao] ?? ASSOCIATIVE_TIER;
}

// One connection incident to an assunto's ASSUNTO node.
export interface AssuntoEdge {
  tipoRelacao: string;
  peso: number;
}

/**
 * Priority weight = Σ (tier of the relation type × edge weight) over every edge
 * incident to the assunto's ASSUNTO node. No edges ⇒ 0.
 * @example assuntoWeight([{ tipoRelacao: 'CONTEM', peso: 2 }]) // 6
 */
export function assuntoWeight(edges: AssuntoEdge[]): number {
  return edges.reduce((sum, e) => sum + relationTier(e.tipoRelacao) * e.peso, 0);
}
