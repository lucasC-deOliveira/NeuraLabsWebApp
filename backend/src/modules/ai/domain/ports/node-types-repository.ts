// Read port: the node type (tipoNode) of each referenced entity in a graph,
// keyed by referenciaId. Used to decide which relations are applicable.
export interface NodeTypesRepository {
  loadNodeTypes(userId: string, grafoId: string, refIds: string[]): Promise<Map<string, string>>;
}

export const NODE_TYPES_REPOSITORY = Symbol('NODE_TYPES_REPOSITORY');
