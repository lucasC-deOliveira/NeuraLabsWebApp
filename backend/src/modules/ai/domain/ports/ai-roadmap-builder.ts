import type { PathStep } from '../services/learning-path';

export interface RoadmapResult {
  itens: PathStep[];
  dataGeracao: string; // ISO
  novos: number; // items inserted since the last persisted trilha (0 on full generation)
}

// Builds the LLM-driven ("ai") roadmap: first run orders the whole graph; later runs
// place only the newly-added nodes into the persisted order. Kept behind a port so
// BuildRoadmapUseCase stays free of LLM concerns.
export interface AiRoadmapBuilder {
  buildAi(userId: string, grafoId: string, regenerate: boolean): Promise<RoadmapResult>;
}

export const AI_ROADMAP_BUILDER = Symbol('AI_ROADMAP_BUILDER');
