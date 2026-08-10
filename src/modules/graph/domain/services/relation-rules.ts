// Regras de relação entre tipos de nó.
// Cada par (não ordenado) de tipos define quais relações são permitidas;
// pares fora desta tabela não podem ser relacionados.

const pairKey = (a: string, b: string): string => [a, b].sort().join("|");

// Relações de uma Nota com um Conceito. Um flashcard "solto" (sem nota de
// origem) pode descrever um conceito com as mesmas relações de uma nota;
// quando o flashcard vem de uma nota, ele apenas HERDA as relações dela.
const NOTA_CONCEITO_RELATIONS = [
  "DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO",
];

/** Pares de tipos e suas relações permitidas — também alimenta a legenda do grafo. */
export const RELATION_PAIRS: Array<{ a: string; b: string; relations: string[] }> = [
  // Texto original (fonte) gera notas
  {
    a: "TEXTO_BRUTO",
    b: "NOTA",
    relations: ["GERA"],
  },
  {
    a: "NOTA",
    b: "CONCEITO",
    relations: NOTA_CONCEITO_RELATIONS,
  },
  {
    a: "CONCEITO",
    b: "CONCEITO",
    relations: [
      "IS_A", "PART_OF", "PREREQUISITO", "DERIVA_DE", "EVOLUI_PARA", "REFORCA",
      "ALTERNATIVA_A", "CONTRASTA_COM", "CONFUNDE_COM", "ANTI_PADRAO_DE", "MEDIDO_POR", "OBJETIVO_DE",
    ],
  },
  { a: "CONCEITO", b: "TOPICO", relations: ["PERTENCE_A", "FUNDAMENTA", "APLICADO_EM"] },
  { a: "TOPICO", b: "TOPICO", relations: ["SUBTOPICO_DE", "RELACIONADO", "DEPENDE_DE", "EVOLUI_PARA"] },
  { a: "TOPICO", b: "ASSUNTO", relations: ["PERTENCE_A", "APLICADO_EM"] },
  { a: "NOTA", b: "TOPICO", relations: ["PERTENCE_A"] },
  { a: "NOTA", b: "ASSUNTO", relations: ["PERTENCE_A"] },
  // Flashcard testa uma nota e herda os conceitos dela (HERDA). Sem nota de
  // origem, pode relacionar-se a um conceito como uma nota faria.
  { a: "FLASHCARD", b: "NOTA", relations: ["TESTA"] },
  { a: "FLASHCARD", b: "CONCEITO", relations: ["HERDA", ...NOTA_CONCEITO_RELATIONS] },
  // Baralho contém flashcards
  { a: "BARALHO", b: "FLASHCARD", relations: ["CONTEM"] },
  // Questões de prova espelham baralho/flashcard: prova CONTEM questão, e a
  // questão TESTA o conceito que ela cobra (HERDA quando vem de um conceito).
  // Espelho do mesmo par no backend (graph/domain/services/relation-rules.ts) —
  // as duas tabelas precisam concordar, senão o Push rejeita o que a UI deixou criar.
  { a: "PROVA", b: "QUESTION", relations: ["CONTEM"] },
  { a: "QUESTION", b: "CONCEITO", relations: ["HERDA", "TESTA", ...NOTA_CONCEITO_RELATIONS] },
  { a: "QUESTION", b: "TOPICO", relations: ["PERTENCE_A"] },
];

const RELATION_RULES: Record<string, string[]> = Object.fromEntries(
  RELATION_PAIRS.map((p) => [pairKey(p.a, p.b), p.relations])
);

/** Relações permitidas entre dois tipos de nó (ordem dos tipos é indiferente). */
export function getAllowedRelations(typeA: string, typeB: string): string[] {
  return RELATION_RULES[pairKey(typeA, typeB)] ?? [];
}

/** Um par de tipos pode ter alguma relação? */
export function canRelate(typeA: string, typeB: string): boolean {
  return getAllowedRelations(typeA, typeB).length > 0;
}

/** A relação é válida para este par de tipos? */
export function isRelationAllowed(typeA: string, typeB: string, relation: string): boolean {
  return getAllowedRelations(typeA, typeB).includes(relation);
}

/**
 * Direção canônica (origem→destino) de uma relação entre dois tipos.
 * Retorna [origemTipo, destinoTipo] conforme RELATION_PAIRS, ou null se inválida.
 */
export function getCanonicalDirection(
  typeA: string,
  typeB: string,
  relation: string,
): [string, string] | null {
  for (const p of RELATION_PAIRS) {
    if (!p.relations.includes(relation)) continue;
    if ((p.a === typeA && p.b === typeB) || (p.a === typeB && p.b === typeA)) {
      return [p.a, p.b];
    }
  }
  return null;
}

// tipos de nó de conhecimento que um insight pode criar/conectar
const INSIGHT_TARGET_TYPES = ["ASSUNTO", "TOPICO", "CONCEITO"];

/**
 * Combos (tipo de nó de conhecimento + relações permitidas) que um nó de
 * `sourceType` pode criar para um insight.
 */
export function getInsightTargets(sourceType: string): Array<{ tipo: string; relacoes: string[] }> {
  const out: Array<{ tipo: string; relacoes: string[] }> = [];
  for (const tipo of INSIGHT_TARGET_TYPES) {
    const relacoes = getAllowedRelations(sourceType, tipo);
    if (relacoes.length > 0) out.push({ tipo, relacoes });
  }
  return out;
}
