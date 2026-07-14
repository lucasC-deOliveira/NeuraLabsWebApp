import type { GraphQuery, GraphListPage } from '../../domain/ports/graph-query';
import {
  parseGraphListQuery,
  type RawGraphListQuery,
} from '../../domain/services/parse-graph-list-query';

/**
 * Lists the user's knowledge graphs with server-side search/filter/sort/pagination.
 * The raw HTTP query is validated/normalized before hitting the read model.
 * @example listGraphs.execute('u1', { tipo: 'raiz', page: '2' }) // → GraphListPage
 */
export class ListGraphsUseCase {
  constructor(private readonly graphs: GraphQuery) {}

  execute(userId: string, raw: RawGraphListQuery = {}): Promise<GraphListPage> {
    return this.graphs.listForUser(userId, parseGraphListQuery(raw));
  }
}
