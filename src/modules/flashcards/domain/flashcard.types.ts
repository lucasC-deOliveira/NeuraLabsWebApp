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
