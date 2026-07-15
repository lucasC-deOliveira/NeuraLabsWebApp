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

// Tag de um conceito conectado ao flashcard no grafo, com seus pais (tópico/assunto).
// Os ids dos pais acompanham os nomes para a lista poder filtrar pela tag exibida.
export interface ConceptTag {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
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
  // Conceitos aos quais o flashcard está conectado no grafo (+ tópicos/assuntos pais).
  // Vazio quando o flashcard não é nó de nenhum grafo.
  conceitosConectados: ConceptTag[];
  dataCriacao: Date;
  spacedRepetition: SpacedRepetition | null;
}
