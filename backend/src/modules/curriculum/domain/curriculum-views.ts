export interface CreateConceptInput {
  nome: string;
  assuntoId: string;
  topicoId: string;
}

export interface CreatedNode {
  id: string;
  nome: string;
}

// getConceptHierarchy: assunto → topicos → conceitos (concept dropdown).
export interface ConceptHierarchyTopico {
  id: string;
  nome: string;
  conceitos: Array<{ id: string; nome: string }>;
}
export interface ConceptHierarchyAssunto {
  id: string;
  nome: string;
  topicos: ConceptHierarchyTopico[];
}

// getFlashcardFilterData: assuntos → topicos (filters).
export interface FilterTopico {
  id: string;
  nome: string;
  assuntoId: string;
}
export interface FilterAssunto {
  id: string;
  nome: string;
  topicos: FilterTopico[];
}

// listSubjects: assuntos with their topics (home).
export interface SubjectSummary {
  id: string;
  nome: string;
  descricao: string | null;
  topicos: Array<{ id: string; nome: string }>;
}

// getHierarquiaConceitos: the full Assunto → Tópico → Conceito tree.
export interface TreeConceito {
  id: string;
  nome: string;
  topicoId: string;
  topicoNome: string;
  assuntoId: string;
  assuntoNome: string;
}
export interface TreeTopico {
  id: string;
  nome: string;
  assuntoId: string;
  relacoesTopicoConceito: Array<{ tipoRelacao: 'FUNDAMENTA'; conceitos: TreeConceito[] }>;
}
export interface TreeAssunto {
  id: string;
  nome: string;
  relAssuntoTopico: Array<{ tipoRelacao: 'PERTENCE_A'; topicos: TreeTopico[] }>;
}
