import type { NodeContentSearchQuery } from '../../domain/ports/node-content-search-query';

/**
 * Searches a graph's node content, returning the matching node referenciaIds.
 * The term is trimmed and capped at 200 chars; a blank term yields no matches.
 * @example searchNodeContent.execute('u1', 'g1', 'mitose')
 */
export class SearchNodeContentUseCase {
  constructor(private readonly search: NodeContentSearchQuery) {}

  async execute(userId: string, grafoId: string, query: string): Promise<string[]> {
    const term = (query ?? '').trim().slice(0, 200);
    if (!term || !grafoId) return [];
    return this.search.matchingNodeRefs(userId, grafoId, term);
  }
}
