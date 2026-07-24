// O que se explica pela Feynman: um conceito do grafo ou a resposta de um flashcard.
export type FeynmanAlvoTipo = 'CONCEITO' | 'FLASHCARD';

// Contexto do alvo montado do grafo/relacional para a IA avaliar a explicação.
export interface FeynmanTargetContext {
  nome: string; // nome do conceito ou pergunta do flashcard
  descricao: string; // descrição do conceito ou resposta do flashcard
  material: string[]; // evidências do que se espera (notas/flashcards conectados)
  candidatos: { id: string; nome: string }[]; // conceitos aos quais mapear lacunas
}

// Read port: só o adapter conhece o Prisma; null se o alvo não é do usuário.
export interface FeynmanContextSource {
  load(userId: string, tipo: FeynmanAlvoTipo, id: string): Promise<FeynmanTargetContext | null>;
}

export const FEYNMAN_CONTEXT_SOURCE = Symbol('FEYNMAN_CONTEXT_SOURCE');
