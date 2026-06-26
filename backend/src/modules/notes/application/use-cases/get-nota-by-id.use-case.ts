import type { NotaQuery } from '../../domain/ports/nota-query';
import type { NotaDetail } from '../../domain/note-views';

/**
 * Returns a note's detail (with related concepts), or null when not found.
 * @example getNotaById.execute('u1', 'n1')
 */
export class GetNotaByIdUseCase {
  constructor(private readonly query: NotaQuery) {}

  execute(userId: string, notaId: string): Promise<NotaDetail | null> {
    return this.query.findNotaDetail(userId, notaId);
  }
}
