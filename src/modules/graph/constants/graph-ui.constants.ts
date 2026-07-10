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
  TESTA: "testa",
  CONTEM: "contém",
  TESTA_DEFINICAO: "testa definição",
  TESTA_EXEMPLO: "testa exemplo",
  TESTA_APLICACAO: "testa aplicação",
  TESTA_ANALISE: "testa análise",
  TESTA_SINTESE: "testa síntese",
};

// RELATION GROUPS
export const RELATION_GROUPS = [
  {
    title: "Texto bruto → Nota",
    types: ["GERA"],
  },
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
  {
    title: "Flashcard → Nota / Conceito",
    types: ["TESTA", "HERDA", "DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO"],
  },
  {
    title: "Baralho → Flashcard",
    types: ["CONTEM"],
  },
];

// NODE COLORS — 50-30-20 rule:
//   50% dominant  → bg     (background fill, largest visual area)
//   30% structure → border (defines shape and hierarchy)
//   20% accent    → text   (readable label)
// Two palettes only: light and dark. Each node type has a distinct hue.
export const NODE_TYPE_COLORS = {
  // Azul-marinho — root concept, authoritative. Azul mais escuro que o indigo
  // anterior (mais forte/raiz) e bem distinto do ciano do TÓPICO.
  ASSUNTO: {
    light: { bg: "#dbeafe", border: "#1e3a8a", text: "#172554" },
    dark:  { bg: "#172554", border: "#3b82f6", text: "#bfdbfe" },
  },
  // Cyan — structured, organised. Ciano (não sky blue) para separar bem do indigo
  // do ASSUNTO, que estavam parecidos demais (mesmo matiz azul).
  TOPICO: {
    light: { bg: "#cffafe", border: "#0e7490", text: "#164e63" },
    dark:  { bg: "#083344", border: "#22d3ee", text: "#a5f3fc" },
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
  // Slate/cinza — texto original (fonte), neutro e documental
  TEXTO_BRUTO: {
    light: { bg: "#f1f5f9", border: "#475569", text: "#1e293b" },
    dark:  { bg: "#1e293b", border: "#94a3b8", text: "#e2e8f0" },
  },
  // Laranja — baralho (coleção de flashcards para estudo)
  BARALHO: {
    light: { bg: "#fff7ed", border: "#ea580c", text: "#7c2d12" },
    dark:  { bg: "#3a1a08", border: "#fb923c", text: "#fed7aa" },
  },
  // Violeta escuro — referência a outro grafo (subgrafo)
  GRAFO_REF: {
    light: { bg: "#f5f3ff", border: "#7c3aed", text: "#3b0764" },
    dark:  { bg: "#2e1065", border: "#a78bfa", text: "#ede9fe" },
  },
  // Rosa/vermelho — questão (losango): cor forte e distinta do verde do CONCEITO
  QUESTION: {
    light: { bg: "#ffe4e6", border: "#e11d48", text: "#881337" },
    dark:  { bg: "#4c0519", border: "#fb7185", text: "#fecdd3" },
  },
  // Âmbar/laranja escuro — prova (coleção de questões com gabarito)
  PROVA: {
    light: { bg: "#fffbeb", border: "#d97706", text: "#78350f" },
    dark:  { bg: "#3a2500", border: "#fbbf24", text: "#fef3c7" },
  },
  // Teal — edital (programa/objetos de avaliação), vinculado 1:1 à prova
  EDITAL: {
    light: { bg: "#f0fdfa", border: "#0d9488", text: "#134e4a" },
    dark:  { bg: "#0d3330", border: "#2dd4bf", text: "#ccfbf1" },
  },
};

// NODE LABELS
export const NODE_TYPE_DISPLAY = {
  ASSUNTO: { label: "Assunto" },
  TOPICO: { label: "Tópico" },
  CONCEITO: { label: "Conceito" },
  FLASHCARD: { label: "Flashcard" },
  NOTA: { label: "Nota" },
  TEXTO_BRUTO: { label: "Texto bruto" },
  BARALHO: { label: "Baralho" },
  GRAFO_REF: { label: "Subgrafo" },
  QUESTION: { label: "Questão" },
  PROVA: { label: "Prova" },
  EDITAL: { label: "Edital" },
};