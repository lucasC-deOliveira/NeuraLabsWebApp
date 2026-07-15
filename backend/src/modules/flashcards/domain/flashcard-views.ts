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

// ConceptTag é vocabulário da taxonomia (assunto/tópico/conceito), que vive no
// curriculum — o shared kernel. Reexportado aqui por conveniência dos consumidores
// desta view.
import type { ConceptTag } from '../../curriculum/domain/curriculum-views';
export type { ConceptTag };

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
