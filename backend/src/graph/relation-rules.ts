// Regras de relação entre tipos de nó (mesma fonte de verdade do frontend).
const pairKey = (a: string, b: string) => [a, b].sort().join('|');

export const RELATION_PAIRS: Array<{ a: string; b: string; relations: string[] }> = [
  { a: 'TEXTO_BRUTO', b: 'NOTA', relations: ['GERA'] },
  {
    a: 'NOTA',
    b: 'CONCEITO',
    relations: ['DEFINE', 'EXPLICA', 'APROFUNDA', 'EXEMPLIFICA', 'CONTRASTA', 'SINTETIZA', 'ALERTA_ERRO'],
  },
  {
    a: 'CONCEITO',
    b: 'CONCEITO',
    relations: [
      'IS_A', 'PART_OF', 'PREREQUISITO', 'DERIVA_DE', 'EVOLUI_PARA', 'REFORCA',
      'ALTERNATIVA_A', 'CONTRASTA_COM', 'CONFUNDE_COM', 'ANTI_PADRAO_DE', 'MEDIDO_POR', 'OBJETIVO_DE',
    ],
  },
  { a: 'CONCEITO', b: 'TOPICO', relations: ['PERTENCE_A', 'FUNDAMENTA', 'APLICADO_EM'] },
  { a: 'TOPICO', b: 'TOPICO', relations: ['SUBTOPICO_DE', 'RELACIONADO', 'DEPENDE_DE', 'EVOLUI_PARA'] },
  { a: 'TOPICO', b: 'ASSUNTO', relations: ['PERTENCE_A', 'APLICADO_EM'] },
  { a: 'NOTA', b: 'TOPICO', relations: ['PERTENCE_A'] },
  { a: 'NOTA', b: 'ASSUNTO', relations: ['PERTENCE_A'] },
  { a: 'FLASHCARD', b: 'NOTA', relations: ['TESTA'] },
  {
    a: 'FLASHCARD',
    b: 'CONCEITO',
    relations: ['HERDA', 'DEFINE', 'EXPLICA', 'APROFUNDA', 'EXEMPLIFICA', 'CONTRASTA', 'SINTETIZA', 'ALERTA_ERRO'],
  },
  { a: 'BARALHO', b: 'FLASHCARD', relations: ['CONTEM'] },
];

const RELATION_RULES: Record<string, string[]> = Object.fromEntries(
  RELATION_PAIRS.map((p) => [pairKey(p.a, p.b), p.relations]),
);

export function getAllowedRelations(typeA: string, typeB: string): string[] {
  return RELATION_RULES[pairKey(typeA, typeB)] ?? [];
}

export function isRelationAllowed(typeA: string, typeB: string, relation: string): boolean {
  return getAllowedRelations(typeA, typeB).includes(relation);
}

// Direção canônica (origem→destino) de uma relação entre dois tipos.
export function getCanonicalDirection(typeA: string, typeB: string, relation: string): [string, string] | null {
  for (const p of RELATION_PAIRS) {
    if (!p.relations.includes(relation)) continue;
    if ((p.a === typeA && p.b === typeB) || (p.a === typeB && p.b === typeA)) return [p.a, p.b];
  }
  return null;
}

const INSIGHT_TARGET_TYPES = ['ASSUNTO', 'TOPICO', 'CONCEITO'];

// Combos (tipo de nó + relações) que um nó de sourceType pode criar como insight.
export function getInsightTargets(sourceType: string): Array<{ tipo: string; relacoes: string[] }> {
  const out: Array<{ tipo: string; relacoes: string[] }> = [];
  for (const tipo of INSIGHT_TARGET_TYPES) {
    const relacoes = getAllowedRelations(sourceType, tipo);
    if (relacoes.length > 0) out.push({ tipo, relacoes });
  }
  return out;
}
