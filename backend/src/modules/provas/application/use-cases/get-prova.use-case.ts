import { assertOwner } from '../../domain/errors';
import type { ProvaRepository } from '../../domain/ports/prova-repository';
import type { ProvaDetail } from '../../domain/prova';

/**
 * Loads one exam with its ordered questions, asserting the caller owns it.
 * @example getProva.execute('u1', 'prova-id')
 */
export class GetProvaUseCase {
  constructor(private readonly repo: ProvaRepository) {}

  async execute(userId: string, id: string): Promise<ProvaDetail> {
    const found = await this.repo.findDetail(id);
    assertOwner(found, userId);
    return found.detail;
  }
}
