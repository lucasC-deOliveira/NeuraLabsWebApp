// Relation options (value + pt-BR label) offered when linking a subgraph to its parent.
// Shared by CreateSubgrafoModal and ExtractSubgrafoModal.
export const GRAFO_REF_RELATIONS = [
  { value: "PREREQUISITO", label: "Pré-requisito" },
  { value: "APROFUNDA", label: "Aprofunda" },
  { value: "DERIVA_DE", label: "Deriva de" },
  { value: "APLICADO_EM", label: "Aplicado em" },
  { value: "CONTRASTA_COM", label: "Contrasta com" },
  { value: "SINTETIZA", label: "Sintetiza" },
  { value: "RELACIONADO", label: "Relacionado" },
] as const;
