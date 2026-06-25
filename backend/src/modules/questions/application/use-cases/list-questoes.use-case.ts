import type { QuestaoRepository } from '../../domain/ports/questao-repository';
import type { QuestaoView } from '../../domain/questao';

/**
 * Lists the user's questions, newest first.
 * @example listQuestoes.execute('u1')
 */
export class ListQuestoesUseCase {
  constructor(private readonly repo: QuestaoRepository) {}

  execute(userId: string): Promise<QuestaoView[]> {
    return this.repo.listByUser(userId);
  }
}
