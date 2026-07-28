import type { StudyCardView } from './study-card-query';

// Read port: cards NOVOS (sem aprendizado) de um grafo, na ordem do roadmap do modo.
// É o que faz o roadmap dirigir o estudo — os novos entram na prioridade da trilha.
export interface RoadmapNewCardsQuery {
  findByRoadmap(
    userId: string,
    grafoId: string,
    modo: string,
    limit: number,
  ): Promise<StudyCardView[]>;
}

export const ROADMAP_NEW_CARDS_QUERY = Symbol('ROADMAP_NEW_CARDS_QUERY');
