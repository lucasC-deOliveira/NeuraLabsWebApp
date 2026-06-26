import { assertOwner } from '../../domain/errors';
import type { QuestaoRepository } from '../../domain/ports/questao-repository';
import type { QuestaoView } from '../../domain/questao';

/**
 * Returns a question owned by the user; throws if missing or not theirs.
 * @example getQuestao.execute('u1', 'q1')
 */
export class GetQuestaoUseCase {
  constructor(private readonly repo: QuestaoRepository) {}

  async execute(userId: string, id: string): Promise<QuestaoView> {
    const questao = await this.repo.findById(id);
    assertOwner(questao, userId);
    return questao;
  }
}
