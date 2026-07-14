import type { GraphAssunto, GraphQuery } from '../../domain/ports/graph-query';

/**
 * Lists the distinct assuntos present as ASSUNTO nodes across the user's graphs.
 * Feeds the "filter by assunto" control on the graph list page.
 * @example listGraphAssuntos.execute('u1') // → [{ id, nome }, ...]
 */
export class ListGraphAssuntosUseCase {
  constructor(private readonly graphs: GraphQuery) {}

  execute(userId: string): Promise<GraphAssunto[]> {
    return this.graphs.listAssuntos(userId);
  }
}
