// Read port for full-text search over a graph's node content. Returns the
// referenciaIds of nodes whose content (per type) matches the term.
export interface NodeContentSearchQuery {
  matchingNodeRefs(userId: string, grafoId: string, term: string): Promise<string[]>;
}

export const NODE_CONTENT_SEARCH_QUERY = Symbol('NODE_CONTENT_SEARCH_QUERY');
