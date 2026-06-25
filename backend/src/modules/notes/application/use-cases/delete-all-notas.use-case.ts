import type { NotaRepository } from '../../domain/ports/nota-repository';

/**
 * Deletes all of the user's notes, returning how many were removed.
 * @example deleteAllNotas.execute('u1')
 */
export class DeleteAllNotasUseCase {
  constructor(private readonly repo: NotaRepository) {}

  async execute(userId: string): Promise<{ count: number }> {
    return { count: await this.repo.deleteAll(userId) };
  }
}
