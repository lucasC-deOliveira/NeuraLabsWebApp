import type { ImportanceRow } from '../services/conceito-importance';

// Read port for the importance ranking: loads each CONCEITO of a graph with its
// parent topic and how many exam questions test it (TESTA edges). When provaId is
// given, provaFreq counts only that exam's questions (a graph may have several
// provas); otherwise every question's. Only the adapter knows the node/edge tables.
export interface ConceitoImportanceSource {
  // Sem grafoId: todos os conceitos do usuário, numa escala só. Com: só os da vista.
  load(userId: string, grafoId?: string, provaId?: string): Promise<ImportanceRow[]>;
}

export const CONCEITO_IMPORTANCE_SOURCE = Symbol('CONCEITO_IMPORTANCE_SOURCE');
