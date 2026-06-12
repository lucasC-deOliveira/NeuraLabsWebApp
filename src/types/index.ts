// ==========================================
// Shared types for the flashcard study layer
// ==========================================

export interface FlashcardData {
  id: string;
  pergunta: string;
  resposta: string;
  // pode ser null: flashcards criados via importação não têm conceito associado
  conceito: string | null;
}

export interface ReviewResult {
  flashcardId: string;
  acertou: boolean;
  nivelConfianca: number;
  tipoErro?: "CONCEITUAL" | "DETALHE" | "EXCECAO" | "INCOMPLETO";
  respostaUsuario: string;
  tempoResposta?: number;
}

export interface StudySession {
  id: string;
  cards: FlashcardData[];
  currentIndex: number;
  startTime: Date;
}

export interface SpacedRepetitionData {
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
  estagioAprendizado: number;
}

export interface EnhancedFlashcardData {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string;
  topico: string;
  assunto: string;
  topicoId: string;
  assuntoId: string;
  dataCriacao: Date;
  spacedRepetition: SpacedRepetitionData | null;
}

export interface ErrorClassification {
  tipo: "CONCEITUAL" | "DETALHE" | "EXCECAO" | "INCOMPLETO";
  explicacao: string;
}

export interface FlashcardFilters {
  search: string;
  assuntoId?: string;
  topicoId?: string;
  status?: "all" | "due" | "not-due" | "overdue" | "new" | "mastered";
  sortBy?: "date" | "difficulty" | "interval" | "alpha";
}
