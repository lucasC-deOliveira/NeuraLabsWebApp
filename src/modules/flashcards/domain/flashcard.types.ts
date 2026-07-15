// Flashcard domain model, flashcards-owned. Mirrors the @/lib/content-api
// boundary; the infra adapter returns the structurally compatible shape.

export type TipoFlashcard =
  | "DEFINICAO" | "EXPLICACAO" | "EXEMPLO" | "APLICACAO" | "CONTRASTE"
  | "COMPLETAR" | "ORDENACAO" | "RELACIONAL" | "ERRO_COMUM";

export interface SpacedRepetition {
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
  estagioAprendizado: number;
}

// Tag de um conceito conectado ao flashcard no grafo, com seus pais.
// Os ids acompanham os nomes para a tag exibida poder virar filtro (clique).
export interface FlashcardConceptTag {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
}

export interface FlashcardItem {
  id: string;
  tipo: TipoFlashcard | null;
  pergunta: string;
  resposta: string;
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
  // Conceitos conectados no grafo (+ tópicos/assuntos pais). Vazio se fora de grafos.
  conceitosConectados: FlashcardConceptTag[];
  dataCriacao: Date;
  spacedRepetition: SpacedRepetition | null;
}

export interface AssuntoOption {
  id: string;
  nome: string;
  topicos: Array<{ id: string; nome: string; assuntoId: string }>;
}

export interface ConceptOption {
  id: string;
  nome: string;
  topicoNome: string;
  assuntoNome: string;
}
