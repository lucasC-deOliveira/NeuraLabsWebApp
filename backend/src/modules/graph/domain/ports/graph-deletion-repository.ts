// Persistence port para apagar um grafo. O grafo é uma VISTA: apagá-lo apaga a
// contenção (que nós ele mostrava, e onde), nunca as entidades — elas pertencem ao
// sistema e podem estar em outros grafos.
//
// Este port era bem maior: tinha listMembers, existsInOtherGraph e um plano
// ordenado de deleção (GraphDeletionExecution). Tudo existia para decidir quais
// entidades morriam junto com o grafo — pergunta que deixou de fazer sentido
// quando o nó passou a ser do sistema. Apagar entidade é o DeleteNodeUseCase.
export interface GraphDeletionRepository {
  graphExists(grafoId: string, userId: string): Promise<boolean>;
  deleteGraph(grafoId: string): Promise<void>;
}

export const GRAPH_DELETION_REPOSITORY = Symbol('GRAPH_DELETION_REPOSITORY');
