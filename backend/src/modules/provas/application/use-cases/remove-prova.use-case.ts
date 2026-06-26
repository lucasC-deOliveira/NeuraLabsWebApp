import { assertOwner } from '../../domain/errors';
import type { ProvaRepository } from '../../domain/ports/prova-repository';

/**
 * Deletes an owned exam.
 * @example removeProva.execute('u1', 'prova-id')
 */
export class RemoveProvaUseCase {
  constructor(private readonly repo: ProvaRepository) {}

  async execute(userId: string, id: string): Promise<{ success: true }> {
    assertOwner(await this.repo.findOwner(id), userId);
    await this.repo.delete(id);
    return { success: true };
  }
}
