import type { NotaRepository } from '../../domain/ports/nota-repository';

/**
 * Deletes one of the user's notes (no-op if it isn't theirs).
 * @example deleteNota.execute('u1', 'n1')
 */
export class DeleteNotaUseCase {
  constructor(private readonly repo: NotaRepository) {}

  async execute(userId: string, id: string): Promise<{ success: boolean }> {
    await this.repo.deleteNota(userId, id);
    return { success: true };
  }
}
