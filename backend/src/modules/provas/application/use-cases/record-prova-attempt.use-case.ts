import { EmptyAttemptError } from '../../domain/errors';
import type {
  ProvaAttemptInput,
  ProvaAttemptRepository,
} from '../../domain/ports/prova-attempt-repository';

/**
 * Persiste uma tentativa de prova (quiz) com suas respostas por questão. N por
 * prova — cada refação é uma tentativa (histórico/progresso).
 * @example useCase.execute(userId, { provaId, acertos, total, tempoTotalMs, respostas })
 */
export class RecordProvaAttemptUseCase {
  constructor(private readonly repo: ProvaAttemptRepository) {}

  async execute(userId: string, attempt: ProvaAttemptInput): Promise<{ id: string }> {
    if (!attempt.respostas.length) throw new EmptyAttemptError(attempt.respostas.length);
    return this.repo.save(userId, attempt);
  }
}
