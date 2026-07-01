// Human-friendly (pt-BR) labels for relation types, grouped by node-type pair —
// used to render the relation name in the edge list. Presentation-only display data.

export interface RelationGroup {
  title: string;
  types: Array<{ value: string; label: string }>;
}

export const RELATION_GROUPS: RelationGroup[] = [
  {
    title: "Nota → Conceito",
    types: [
      { value: "DEFINE", label: "define" },
      { value: "EXPLICA", label: "explica" },
      { value: "APROFUNDA", label: "aprofunda" },
      { value: "EXEMPLIFICA", label: "exemplifica" },
      { value: "CONTRASTA", label: "contrasta" },
      { value: "SINTETIZA", label: "sintetiza" },
      { value: "ALERTA_ERRO", label: "alerta erro" },
    ],
  },
  {
    title: "Conceito ↔ Conceito",
    types: [
      { value: "IS_A", label: "é um" },
      { value: "PART_OF", label: "parte de" },
      { value: "PREREQUISITO", label: "pré-requisito" },
      { value: "DERIVA_DE", label: "deriva de" },
      { value: "EVOLUI_PARA", label: "evolui para" },
      { value: "REFORCA", label: "reforça" },
      { value: "ALTERNATIVA_A", label: "alternativa" },
      { value: "CONTRASTA_COM", label: "contrasta com" },
      { value: "CONFUNDE_COM", label: "confunde com" },
      { value: "ANTI_PADRAO_DE", label: "anti-padrão" },
      { value: "MEDIDO_POR", label: "medido por" },
      { value: "OBJETIVO_DE", label: "objetivo de" },
    ],
  },
  {
    title: "Conceito ↔ Tópico",
    types: [
      { value: "PERTENCE_A", label: "pertence a" },
      { value: "FUNDAMENTA", label: "fundamenta" },
      { value: "APLICADO_EM", label: "aplicado em" },
    ],
  },
  {
    title: "Tópico ↔ Tópico",
    types: [
      { value: "SUBTOPICO_DE", label: "subtópico de" },
      { value: "RELACIONADO", label: "relacionado" },
      { value: "DEPENDE_DE", label: "depende de" },
      { value: "EVOLUI_PARA", label: "evolui para" },
    ],
  },
  {
    title: "Hierárquicas",
    types: [
      { value: "GERA", label: "gera" },
      { value: "HERDA", label: "herda" },
      { value: "REFERENCIA", label: "referência" },
    ],
  },
];

const LABEL_BY_TYPE: Map<string, string> = new Map(
  RELATION_GROUPS.flatMap((g) => g.types.map((t) => [t.value, t.label] as const)),
);

/** Human label for a relation type, falling back to the raw type. */
export function getRelationLabel(type: string): string {
  return LABEL_BY_TYPE.get(type) ?? type;
}
