import type { GraphQuery, GraphListPage } from '../../domain/ports/graph-query';
import {
  parseGraphListQuery,
  type RawGraphListQuery,
} from '../../domain/services/parse-graph-list-query';
import type { CachePort } from '../../../cache/domain/cache-port';

// A lista muda com quase qualquer mutação no grafo (compor item bumpa
// dataAtualizacao/filhosCount), então o TTL é curto: rede de segurança que
// limita o stale enquanto a invalidação por tag cobre as mutações visíveis.
const LIST_TTL_MS = 30_000;

/**
 * Lists the user's knowledge graphs with server-side search/filter/sort/pagination.
 * The raw HTTP query is validated/normalized before hitting the read model.
 * @example listGraphs.execute('u1', { tipo: 'raiz', page: '2' }) // → GraphListPage
 */
export class ListGraphsUseCase {
  constructor(
    private readonly graphs: GraphQuery,
    private readonly cache: CachePort,
  ) {}

  execute(userId: string, raw: RawGraphListQuery = {}): Promise<GraphListPage> {
    const query = parseGraphListQuery(raw);
    // A chave dobra o query normalizado — filtros/páginas diferentes não colidem.
    const key = `graphs:list:${userId}:${JSON.stringify(query)}`;
    return this.cache.getOrCompute(key, LIST_TTL_MS, () => this.graphs.listForUser(userId, query), [
      `user:${userId}`,
    ]);
  }
}
