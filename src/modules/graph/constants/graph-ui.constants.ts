// RELATION LABELS
export const RELATION_LABELS: Record<string, string> = {
  GERA: "gera",
  REFERENCIA: "referência",
  DEFINE: "define",
  EXPLICA: "explica",
  APROFUNDA: "aprofunda",
  EXEMPLIFICA: "exemplifica",
  CONTRASTA: "contrasta",
  SINTETIZA: "sintetiza",
  ALERTA_ERRO: "alerta erro",
  IS_A: "é um",
  PART_OF: "parte de",
  PREREQUISITO: "pré-requisito",
  DERIVA_DE: "deriva de",
  EVOLUI_PARA: "evolui para",
  REFORCA: "reforça",
  ALTERNATIVA_A: "alternativa",
  CONTRASTA_COM: "contrasta com",
  CONFUNDE_COM: "confunde com",
  ANTI_PADRAO_DE: "anti-padrão",
  MEDIDO_POR: "medido por",
  OBJETIVO_DE: "objetivo de",
  PERTENCE_A: "pertence a",
  FUNDAMENTA: "fundamenta",
  APLICADO_EM: "aplicado em",
  SUBTOPICO_DE: "subtópico de",
  RELACIONADO: "relacionado",
  DEPENDE_DE: "depende de",
  HERDA: "herda",
  TESTA_DEFINICAO: "testa definição",
  TESTA_EXEMPLO: "testa exemplo",
  TESTA_APLICACAO: "testa aplicação",
  TESTA_ANALISE: "testa análise",
  TESTA_SINTESE: "testa síntese",
};

// RELATION GROUPS
export const RELATION_GROUPS = [
  {
    title: "Nota → Conceito",
    types: ["DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO"],
  },
  {
    title: "Conceito ↔ Conceito",
    types: ["IS_A", "PART_OF", "PREREQUISITO", "DERIVA_DE", "EVOLUI_PARA", "REFORCA", "ALTERNATIVA_A", "CONTRASTA_COM", "CONFUNDE_COM", "ANTI_PADRAO_DE", "MEDIDO_POR", "OBJETIVO_DE"],
  },
  {
    title: "Conceito ↔ Tópico",
    types: ["PERTENCE_A", "FUNDAMENTA", "APLICADO_EM"],
  },
  {
    title: "Tópico ↔ Tópico",
    types: ["SUBTOPICO_DE", "RELACIONADO", "DEPENDE_DE", "EVOLUI_PARA"],
  },
  {
    title: "Tópico ↔ Matéria",
    types: ["PERTENCE_A", "APLICADO_EM"],
  },
];

// NODE COLORS — 50-30-20 rule:
//   50% dominant  → bg     (background fill, largest visual area)
//   30% structure → border (defines shape and hierarchy)
//   20% accent    → text   (readable label)
// Two palettes only: light and dark. Each node type has a distinct hue.
export const NODE_TYPE_COLORS = {
  // Indigo — root concept, authoritative
  ASSUNTO: {
    light: { bg: "#eef2ff", border: "#4338ca", text: "#1e1b4b" },
    dark:  { bg: "#1e1b4b", border: "#818cf8", text: "#c7d2fe" },
  },
  // Sky blue — structured, organised
  TOPICO: {
    light: { bg: "#e0f2fe", border: "#0369a1", text: "#0c4a6e" },
    dark:  { bg: "#0c2840", border: "#38bdf8", text: "#bae6fd" },
  },
  // Emerald — knowledge, clarity
  CONCEITO: {
    light: { bg: "#d1fae5", border: "#059669", text: "#064e3b" },
    dark:  { bg: "#064e3b", border: "#34d399", text: "#a7f3d0" },
  },
  // Amarelo — revisão, prática
  FLASHCARD: {
    light: { bg: "#fef9c3", border: "#eab308", text: "#a16207" },
    dark:  { bg: "#2a2305", border: "#facc15", text: "#fef08a" },
  },
  // Fuchsia — writing, annotation
  NOTA: {
    light: { bg: "#fdf4ff", border: "#9333ea", text: "#4a044e" },
    dark:  { bg: "#2e0540", border: "#e879f9", text: "#f5d0fe" },
  },
};

// NODE LABELS
export const NODE_TYPE_DISPLAY = {
  ASSUNTO: { label: "Assunto" },
  TOPICO: { label: "Tópico" },
  CONCEITO: { label: "Conceito" },
  FLASHCARD: { label: "Flashcard" },
  NOTA: { label: "Nota" },
};