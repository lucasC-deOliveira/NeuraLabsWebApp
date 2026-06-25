import { assertOwner } from '../../domain/errors';
import type { QuestaoRepository } from '../../domain/ports/questao-repository';

/**
 * Deletes a question owned by the user; throws if missing or not theirs.
 * @example removeQuestao.execute('u1', 'q1')
 */
export class RemoveQuestaoUseCase {
  constructor(private readonly repo: QuestaoRepository) {}

  async execute(userId: string, id: string): Promise<{ success: boolean }> {
    assertOwner(await this.repo.findById(id), userId);
    await this.repo.delete(id);
    return { success: true };
  }
}
