import type { StudyCardView } from './study-card-query';

// Read port: cards NOVOS (sem aprendizado) dos grafos do plano, na ordem do roadmap
// do modo (concatena as trilhas por grafo). É o que faz o roadmap dirigir o estudo.
export interface RoadmapNewCardsQuery {
  findByRoadmap(
    userId: string,
    grafoIds: string[],
    modo: string,
    limit: number,
  ): Promise<StudyCardView[]>;
}

export const ROADMAP_NEW_CARDS_QUERY = Symbol('ROADMAP_NEW_CARDS_QUERY');
