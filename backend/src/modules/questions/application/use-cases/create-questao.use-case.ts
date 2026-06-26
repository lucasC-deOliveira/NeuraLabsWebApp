import type { QuestaoRepository } from '../../domain/ports/questao-repository';
import type { CreateQuestaoInput } from '../../domain/questao';

/**
 * Creates a question for the user.
 * @example createQuestao.execute('u1', { tipo, enunciado, gabarito })
 */
export class CreateQuestaoUseCase {
  constructor(private readonly repo: QuestaoRepository) {}

  async execute(userId: string, input: CreateQuestaoInput): Promise<{ questaoId: string }> {
    return { questaoId: await this.repo.create(userId, input) };
  }
}
