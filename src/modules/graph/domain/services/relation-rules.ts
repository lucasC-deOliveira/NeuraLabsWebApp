// Regras de relação entre tipos de nó.
// Cada par (não ordenado) de tipos define quais relações são permitidas;
// pares fora desta tabela não podem ser relacionados.

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/** Pares de tipos e suas relações permitidas — também alimenta a legenda do grafo. */
export const RELATION_PAIRS: Array<{ a: string; b: string; relations: string[] }> = [
  {
    a: "NOTA",
    b: "CONCEITO",
    relations: ["DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO"],
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
  { a: "FLASHCARD", b: "CONCEITO", relations: ["HERDA"] },
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
