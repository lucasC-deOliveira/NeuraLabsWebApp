import type { GraphRepository } from '../../domain/ports/graph-repository';
import type { CreateSubgraphRepository } from '../../domain/ports/create-subgraph-repository';
import type { CachePort } from '../../../cache/domain/cache-port';

// O app tem UM grafo de conhecimento — o master — e tudo o mais é subgrafo dele.
// Criado sob demanda, no primeiro grafo que o usuário fizer.
export const MASTER_GRAPH_NAME = 'Meu Conhecimento';

// Todo subgrafo criado pela tela pendura no master por RELACIONADO — a mesma
// relação que os subgrafos existentes já usam.
const DEFAULT_SUBGRAPH_RELATION = 'RELACIONADO';

/**
 * "Criar um grafo" cria, na verdade, um SUBGRAFO do master do usuário — o app tem
 * um grafo só. O master é resolvido (ou criado, se for o primeiro) e o novo grafo
 * nasce contido nele, ancorado por um nó GRAFO_REF.
 * @example createGraph.execute('u1', 'Cálculo') // subgrafo de "Meu Conhecimento"
 */
export class CreateGraphUseCase {
  constructor(
    private readonly graphs: GraphRepository,
    private readonly subgraphs: CreateSubgraphRepository,
    private readonly cache: CachePort,
  ) {}

  async execute(userId: string, nome: string, descricao?: string): Promise<{ id: string }> {
    const master = await this.resolveMaster(userId);
    const { grafoId } = await this.subgraphs.createSubgraph(userId, master, {
      nome: nome.trim() || 'Novo grafo',
      descricao,
      tipoRelacao: DEFAULT_SUBGRAPH_RELATION,
    });
    // Nova vista na lista do usuário → a listagem cacheada desse usuário some.
    await this.cache.delByTag(`user:${userId}`);
    return { id: grafoId };
  }

  // O master é o único grafo sem pai. Não existe ainda? É o primeiro grafo do
  // usuário: cria-o (sem pai — é ele o topo).
  private async resolveMaster(userId: string): Promise<string> {
    const root = await this.graphs.findRootId(userId);
    if (root) return root;
    const { id } = await this.graphs.create(userId, MASTER_GRAPH_NAME, null);
    return id;
  }
}
