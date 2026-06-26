// Persistence port for linking an exam (Prova) into a graph.
export interface AddProvaRepository {
  graphExists(grafoId: string, userId: string): Promise<boolean>;
  provaExists(provaId: string, userId: string): Promise<boolean>;
  // Links the exam into the graph (idempotent); returns the PROVA node id.
  linkProva(userId: string, grafoId: string, provaId: string): Promise<string>;
}

export const ADD_PROVA_REPOSITORY = Symbol('ADD_PROVA_REPOSITORY');
