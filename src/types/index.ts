// ==========================================
// Shared types for the flashcard study layer
// ==========================================

export interface FlashcardData {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string;
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

export interface ErrorClassification {
  tipo: "CONCEITUAL" | "DETALHE" | "EXCECAO" | "INCOMPLETO";
  explicacao: string;
}
