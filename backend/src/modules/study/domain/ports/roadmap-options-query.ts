// Opções de roadmap de um grafo = os escopos que o plano pode seguir (uma por trilha
// existente). `modo` é a chave da trilha; `label` o texto amigável.
export interface RoadmapOption {
  modo: string;
  label: string;
}

export interface RoadmapOptionsQuery {
  list(userId: string, grafoId: string): Promise<RoadmapOption[]>;
}

export const ROADMAP_OPTIONS_QUERY = Symbol('ROADMAP_OPTIONS_QUERY');
