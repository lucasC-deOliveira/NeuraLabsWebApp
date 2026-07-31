// Read port para a conquista do grafo: as evidências CRUAS de domínio por conceito.
// O domínio do flashcard (decaimento SM-2) é calculado no use-case a partir destas
// linhas — o adapter só faz SQL, sem conhecer a fórmula (que vive no grafo).

export interface FlashcardStateRow {
  conceitoId: string; // conceito que o flashcard DEFINE
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
}

export interface QuestionStatRow {
  conceitoId: string;
  total: number;
  acertos: number;
}

export interface FeynmanClarityRow {
  conceitoId: string;
  clareza: number; // 0..100, última clareza
}

export interface ConceptMasterySource {
  // SM-2 de cada flashcard, marcado pelo conceito que ele DEFINE (aresta do grafo).
  flashcardStates(userId: string): Promise<FlashcardStateRow[]>;
  // Acertos/total nas questões de cada conceito (Questao.conceitoId + respostas).
  questionStats(userId: string): Promise<QuestionStatRow[]>;
  // Última clareza da explicação Feynman de cada conceito.
  feynmanClarity(userId: string): Promise<FeynmanClarityRow[]>;
  // Nomes dos conceitos dados (para a UI listar os "quase lá").
  conceptNames(userId: string, conceitoIds: string[]): Promise<Map<string, string>>;
}

export const CONCEPT_MASTERY_SOURCE = Symbol('CONCEPT_MASTERY_SOURCE');
