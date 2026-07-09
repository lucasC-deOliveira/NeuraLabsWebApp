import type { CreateEditalInput, Edital } from '../prova';

// Persistence port for editais and their 1:1 link to a prova. The adapter also
// materializes the EDITAL node and the REGE edge to the prova's node in the graph.
export interface EditalRepository {
  // Creates an edital (and its EDITAL node); when provaId is given, links it 1:1.
  create(userId: string, input: CreateEditalInput): Promise<{ editalId: string }>;
  // Links an existing edital to a prova (1:1). Throws EditalAlreadyLinkedError or
  // ProvaAlreadyHasEditalError when the 1:1 constraint would be violated.
  linkToProva(userId: string, editalId: string, provaId: string, grafoId: string): Promise<void>;
  listByUser(userId: string): Promise<Edital[]>;
}

export const EDITAL_REPOSITORY = Symbol('EDITAL_REPOSITORY');
