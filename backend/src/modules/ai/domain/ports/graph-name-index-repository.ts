import type { GraphNameIndex } from '../services/name-index';

// Read port shared by the cascading-write features (expand, fill gaps): loads the
// index of existing ASSUNTO/TOPICO/CONCEITO nodes used to avoid duplicates.
export interface GraphNameIndexRepository {
  loadNameIndex(userId: string, grafoId: string): Promise<GraphNameIndex>;
}

export const GRAPH_NAME_INDEX_REPOSITORY = Symbol('GRAPH_NAME_INDEX_REPOSITORY');
