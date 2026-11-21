import {
  VAULT_EXAM_HISTORY_PAGE_SIZE,
  type VaultExamHistoryPage,
} from '../../../../../../contracts/provas';
import { EmptyAttemptError } from '../../domain/errors';
import type {
  ProvaAttemptInput,
  ProvaAttemptRepository,
  RecordedProvaAttempt,
} from '../../domain/ports/prova-attempt-repository';

/**
 * Persiste uma tentativa de prova (quiz) com suas respostas por questão. N por
 * prova — cada refação é uma tentativa (histórico/progresso).
 * @example useCase.execute(userId, { provaId, acertos, total, tempoTotalMs, respostas })
 */
export class RecordProvaAttemptUseCase {
  constructor(private readonly repo: ProvaAttemptRepository) {}

  async execute(userId: string, attempt: ProvaAttemptInput): Promise<RecordedProvaAttempt> {
    if (!attempt.respostas.length) throw new EmptyAttemptError(attempt.respostas.length);
    return this.repo.save(userId, attempt);
  }

  /** Reads one page of the account's completed attempts for a graph.
   * @example const page = await useCase.listVaultHistory(userId, graphId)
   */
  async listVaultHistory(
    userId: string,
    graphId: string,
    after = '',
  ): Promise<VaultExamHistoryPage> {
    const attempts = await this.repo.listForGraph(userId, graphId, after);
    return {
      accountId: userId,
      attempts,
      nextCursor: attempts.length === VAULT_EXAM_HISTORY_PAGE_SIZE ? attempts.at(-1)!.id : null,
    };
  }
}
