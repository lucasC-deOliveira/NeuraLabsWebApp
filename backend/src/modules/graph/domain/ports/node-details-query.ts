// Read model for a node's full content, shaped per node type (the fields differ
// by type: a NOTA exposes titulo/conteudo/…, a FLASHCARD pergunta/resposta, etc.).
export type NodeDetails = Record<string, unknown>;
export type ConceptGraphMembership = { id: string; name: string };

// Read port: a node's details by type, or null when not found / not owned.
export interface NodeDetailsQuery {
  findDetails(userId: string, tipoNode: string, refId: string): Promise<NodeDetails | null>;
  findConceptGraphs(userId: string, refId: string): Promise<ConceptGraphMembership[]>;
}

export const NODE_DETAILS_QUERY = Symbol('NODE_DETAILS_QUERY');
