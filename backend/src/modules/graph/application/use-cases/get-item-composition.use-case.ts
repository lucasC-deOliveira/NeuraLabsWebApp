import type { CompositionGraph } from '../../domain/composition-views';
import type { CompositionRootType, CompositionSource } from '../../domain/ports/composition-source';
import { buildComposition } from '../../domain/services/build-composition';

/**
 * Roll-up: monta o subgrafo composto de um item (flashcard/questão/baralho/prova)
 * no vocabulário do grafo. Fonte única do mini-grafo e da composição no import.
 * Retorna null quando o item não existe/não é do usuário (o controller → 404).
 * @example useCase.execute('u1', 'BARALHO', 'b1')
 */
export class GetItemCompositionUseCase {
  constructor(private readonly source: CompositionSource) {}

  async execute(
    userId: string,
    tipo: CompositionRootType,
    id: string,
  ): Promise<CompositionGraph | null> {
    const input = await this.source.load(userId, tipo, id);
    return input ? buildComposition(input) : null;
  }
}
