import { assertOwner } from '../../domain/errors';
import type { QuestaoRepository, UpdateQuestaoPatch } from '../../domain/ports/questao-repository';

/**
 * Updates a question owned by the user; throws if missing or not theirs.
 * @example updateQuestao.execute('u1', 'q1', { enunciado })
 */
export class UpdateQuestaoUseCase {
  constructor(private readonly repo: QuestaoRepository) {}

  async execute(
    userId: string,
    id: string,
    patch: UpdateQuestaoPatch,
  ): Promise<{ success: boolean }> {
    assertOwner(await this.repo.findById(id), userId);
    await this.repo.update(id, patch);
    return { success: true };
  }
}
