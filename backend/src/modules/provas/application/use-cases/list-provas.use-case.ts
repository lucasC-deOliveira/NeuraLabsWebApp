import type { ProvaRepository } from '../../domain/ports/prova-repository';
import type { ProvaSummary } from '../../domain/prova';

/**
 * Lists the user's exams, newest first, with a question count each.
 * @example listProvas.execute('u1')
 */
export class ListProvasUseCase {
  constructor(private readonly repo: ProvaRepository) {}

  async execute(userId: string): Promise<ProvaSummary[]> {
    return this.repo.listByUser(userId);
  }
}
