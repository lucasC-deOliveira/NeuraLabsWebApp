// Concept hierarchy (assunto → topico → conceito) as consumed by the manual
// note editor. notes-owned; the content adapter returns the structurally
// compatible shape from @/lib/content-api.

export interface ConceitoNode {
  id: string;
  nome: string;
}

export interface RelTopicoConceitoGroup {
  tipoRelacao: string;
  conceitos: ConceitoNode[];
}

export interface TopicoEntry {
  id: string;
  nome: string;
  relacoesTopicoConceito: RelTopicoConceitoGroup[];
}

export interface RelAssuntoTopicoGroup {
  tipoRelacao: string;
  topicos: TopicoEntry[];
}

export interface ConceitoArvore {
  id: string;
  nome: string;
  relAssuntoTopico: RelAssuntoTopicoGroup[];
}

/** A concept flattened with its topic/subject context, for the search list. */
export interface FlatConcept {
  id: string;
  nome: string;
  topicoNome: string;
  topicoId: string;
  assuntoNome: string;
  assuntoId: string;
}

export interface ConceptContext {
  nome: string;
  topicoNome: string;
  assuntoNome: string;
}
