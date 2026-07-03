// Relation type options for the manual note editor's <select>s.

export interface RelationTypeOption {
  value: string;
  label: string;
}

export const NOTA_TO_CONCEITO_TYPES: RelationTypeOption[] = [
  { value: "DEFINE", label: "DEFINE" },
  { value: "EXPLICA", label: "EXPLICA" },
  { value: "APROFUNDA", label: "APROFUNDA" },
  { value: "EXEMPLIFICA", label: "EXEMPLIFICA" },
  { value: "CONTRASTA", label: "CONTRASTA" },
  { value: "SINTETIZA", label: "SINTETIZA" },
  { value: "ALERTA_ERRO", label: "ALERTA_ERRO" },
];

export const CONCEITO_TO_CONCEITO_TYPES: RelationTypeOption[] = [
  { value: "IS_A", label: "IS_A" },
  { value: "PART_OF", label: "PART_OF" },
  { value: "PREREQUISITO", label: "PREREQUISITO" },
  { value: "DERIVA_DE", label: "DERIVA_DE" },
  { value: "EVOLUI_PARA", label: "EVOLUI_PARA" },
  { value: "REFORCA", label: "REFORCA" },
  { value: "ALTERNATIVA_A", label: "ALTERNATIVA_A" },
  { value: "CONTRASTA_COM", label: "CONTRASTA_COM" },
  { value: "CONFUNDE_COM", label: "CONFUNDE_COM" },
  { value: "ANTI_PADRAO_DE", label: "ANTI_PADRAO_DE" },
  { value: "MEDIDO_POR", label: "MEDIDO_POR" },
  { value: "OBJETIVO_DE", label: "OBJETIVO_DE" },
];

export const CONCEITO_TO_TOPICO_TYPES: RelationTypeOption[] = [
  { value: "PERTENCE_A", label: "PERTENCE_A" },
  { value: "FUNDAMENTA", label: "FUNDAMENTA" },
  { value: "APLICADO_EM", label: "APLICADO_EM" },
];
