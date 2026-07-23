import { buildComposition } from '../../domain/services/build-composition';
import type { CompositionRootType, CompositionSource } from '../../domain/ports/composition-source';
import type {
  ComposeIntoGraphRepository,
  ComposeResult,
} from '../../domain/ports/compose-into-graph-repository';

/**
 * Importa um item num grafo COMPONDO tudo: monta o subgrafo do item (mesmo núcleo
 * do mini-grafo) e o mescla no grafo, deduplicando pelas regras existentes.
 * Retorna null se o item ou o grafo não são do usuário (o controller → 404).
 * @example useCase.execute('u1', 'g1', 'BARALHO', 'b1')
 */
export class ComposeItemIntoGraphUseCase {
  constructor(
    private readonly source: CompositionSource,
    private readonly repo: ComposeIntoGraphRepository,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    tipo: CompositionRootType,
    id: string,
  ): Promise<ComposeResult | null> {
    const input = await this.source.load(userId, tipo, id);
    if (!input) return null;
    return this.repo.compose(userId, grafoId, buildComposition(input));
  }
}
