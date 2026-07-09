import type { PathStep } from '../services/learning-path';

export interface SavedTrilha {
  itens: PathStep[];
  dataGeracao: Date;
}

// Persistence port for a graph's roadmap under one mode. One row per (graph, mode);
// `save` upserts and returns the generation timestamp.
export interface RoadmapTrilhaRepository {
  load(userId: string, grafoId: string, modo: string): Promise<SavedTrilha | null>;
  save(userId: string, grafoId: string, modo: string, itens: PathStep[]): Promise<Date>;
}

export const ROADMAP_TRILHA_REPOSITORY = Symbol('ROADMAP_TRILHA_REPOSITORY');
