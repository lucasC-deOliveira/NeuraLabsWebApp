// Read model: um grafo que MOSTRA uma entidade, para o "Ver no grafo" de fora do
// grafo (flashcard, nota, questão, prova) saber para onde navegar.
export interface EntityGraphRef {
  grafoId: string;
  nome: string;
}

// Read port: os grafos que contêm o nó (usuário, tipo, referência). Vazio quando a
// entidade não está em nenhum grafo — o botão então nem aparece.
export interface EntityGraphsQuery {
  graphsContaining(
    userId: string,
    tipoNode: string,
    referenciaId: string,
  ): Promise<EntityGraphRef[]>;
}

export const ENTITY_GRAPHS_QUERY = Symbol('ENTITY_GRAPHS_QUERY');
