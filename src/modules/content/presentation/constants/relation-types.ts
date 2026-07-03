// Relation type options for linking a concept to a topic (used by the shared
// concept-staging pickers).

export interface RelationTypeOption {
  value: string;
  label: string;
}

export const CONCEITO_TO_TOPICO_TYPES: RelationTypeOption[] = [
  { value: "PERTENCE_A", label: "PERTENCE_A" },
  { value: "FUNDAMENTA", label: "FUNDAMENTA" },
  { value: "APLICADO_EM", label: "APLICADO_EM" },
];
