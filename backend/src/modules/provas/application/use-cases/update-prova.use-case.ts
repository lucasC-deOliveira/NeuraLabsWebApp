import { assertOwner } from '../../domain/errors';
import type { ProvaRepository } from '../../domain/ports/prova-repository';
import type { UpdateProvaPatch } from '../../domain/prova';

/**
 * Updates an owned exam's title/description and, when given, its question set.
 * @example updateProva.execute('u1', 'prova-id', { titulo: 'Novo' })
 */
export class UpdateProvaUseCase {
  constructor(private readonly repo: ProvaRepository) {}

  async execute(userId: string, id: string, patch: UpdateProvaPatch): Promise<{ success: true }> {
    assertOwner(await this.repo.findOwner(id), userId);
    await this.repo.update(id, patch);
    return { success: true };
  }
}
