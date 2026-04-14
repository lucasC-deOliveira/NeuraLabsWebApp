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

// NODE COLORS
export const NODE_TYPE_COLORS = {
  ASSUNTO: {
    light: { bg: "#f1f5f9", border: "#475569", text: "#1e293b" },
    dark: { bg: "#1e293b", border: "#94a3b8", text: "#e2e8f0" },
  },
  TOPICO: {
    light: { bg: "#dbeafe", border: "#2563eb", text: "#1e3a5f" },
    dark: { bg: "#1e3a5f", border: "#60a5fa", text: "#bfdbfe" },
  },
  CONCEITO: {
    light: { bg: "#d1fae5", border: "#059669", text: "#064e3b" },
    dark: { bg: "#064e3b", border: "#34d399", text: "#a7f3d0" },
  },
  FLASHCARD: {
    light: { bg: "#fef3c7", border: "#d97706", text: "#78350f" },
    dark: { bg: "#451a03", border: "#fbbf24", text: "#fef3c7" },
  },
  NOTA: {
    light: { bg: "#ede9fe", border: "#7c3aed", text: "#4c1d95" },
    dark: { bg: "#2e1065", border: "#a78bfa", text: "#ede9fe" },
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