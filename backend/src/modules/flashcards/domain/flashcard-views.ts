export interface CreateFlashcardInput {
  pergunta: string;
  resposta: string;
  conceitoId?: string | null;
  tipo?: string | null;
}

export interface UpdateFlashcardPatch {
  pergunta?: string;
  resposta?: string;
  tipo?: string | null;
}

export interface PreviewCard {
  pergunta: string;
  resposta: string;
  conceitoId: string;
}

export interface ListFlashcardsOptions {
  conceptId?: string;
  topicId?: string;
}

export interface SpacedRepetition {
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
  ultimaRevisao: Date | null;
  estagioAprendizado: number;
}

export interface FlashcardView {
  id: string;
  tipo: string | null;
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
