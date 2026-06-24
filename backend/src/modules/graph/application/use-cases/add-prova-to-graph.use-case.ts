import { GraphNotFoundError, ProvaNotFoundError } from '../../domain/errors';
import type { AddProvaRepository } from '../../domain/ports/add-prova-repository';

/**
 * Links an exam (Prova) the user owns into a graph. Idempotent: returns the
 * existing node when already linked.
 * @example addProva.execute('u1', 'g1', 'p1')
 */
export class AddProvaToGraphUseCase {
  constructor(private readonly provas: AddProvaRepository) {}

  async execute(
    userId: string,
    grafoId: string,
    provaId: string,
  ): Promise<{ success: boolean; nodeId: string }> {
    if (!(await this.provas.graphExists(grafoId, userId))) throw new GraphNotFoundError();
    if (!(await this.provas.provaExists(provaId, userId))) throw new ProvaNotFoundError();
    const nodeId = await this.provas.linkProva(userId, grafoId, provaId);
    return { success: true, nodeId };
  }
}
