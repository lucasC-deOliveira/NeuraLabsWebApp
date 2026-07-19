// Prontidão estrutural: um card só rende quando os pré-requisitos do seu conceito
// já estão dominados. Domínio puro, 0 token — a informação já está no grafo
// (arestas PREREQUISITO + nivelDominio propagado dos flashcards).
//
// Reordena, nunca descarta: sugerir uma ordem é ajudar; remover da fila seria
// decidir pelo usuário o que ele pode ou não estudar hoje.

export interface ReadinessCard {
  id: string;
  conceito: string | null;
}

export interface PrerequisiteMastery {
  nome: string;
  // 0..1 — nivelDominio do conceito pré-requisito.
  dominio: number;
}

// conceito → seus pré-requisitos com o domínio atual de cada um.
export type ConceptPrerequisites = Map<string, PrerequisiteMastery[]>;

export interface CardReadiness {
  score: number;
  // O pré-requisito mais fraco, quando ele segura o card. É o que o tutor mostra:
  // "antes disto, reveja X" vale mais que um número.
  blockedBy: string | null;
}

export const READY = 1;

// Abaixo disto o pré-requisito conta como "ainda não dominado" e o card é adiado.
// Casa com a faixa que a UI já pinta como fraco no grafo.
export const WEAK_PREREQUISITE = 0.6;

/**
 * Prontidão de um card: o domínio do seu pré-requisito MAIS FRACO.
 * @example cardReadiness({ id: 'c1', conceito: 'Dijkstra' }, prereqs)
 */
export function cardReadiness(
  card: ReadinessCard,
  prerequisites: ConceptPrerequisites,
): CardReadiness {
  const required = card.conceito ? (prerequisites.get(card.conceito) ?? []) : [];
  if (required.length === 0) return { score: READY, blockedBy: null };
  const weakest = weakestPrerequisite(required);
  return {
    score: weakest.dominio,
    blockedBy: weakest.dominio < WEAK_PREREQUISITE ? weakest.nome : null,
  };
}

/**
 * Cards prontos primeiro; os presos a um pré-requisito fraco vão para o fim,
 * preservando a ordem relativa entre iguais (ordenação estável).
 * @example orderByReadiness(cards, prerequisites)
 */
export function orderByReadiness<T extends ReadinessCard>(
  cards: T[],
  prerequisites: ConceptPrerequisites,
): T[] {
  return cards
    .map((card, index) => ({ card, index, score: cardReadiness(card, prerequisites).score }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.card);
}

function weakestPrerequisite(required: PrerequisiteMastery[]): PrerequisiteMastery {
  return required.reduce((weakest, current) =>
    current.dominio < weakest.dominio ? current : weakest,
  );
}
