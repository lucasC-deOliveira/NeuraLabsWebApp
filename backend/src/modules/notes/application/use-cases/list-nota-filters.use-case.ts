import type { NotaQuery } from '../../domain/ports/nota-query';
import type { FilterAssunto } from '../../domain/note-views';

/**
 * Lists the subjects that have concepts linked to the user's notes (filter data).
 * @example listNotaFilters.execute('u1')
 */
export class ListNotaFiltersUseCase {
  constructor(private readonly query: NotaQuery) {}

  execute(userId: string): Promise<FilterAssunto[]> {
    return this.query.listFilterAssuntos(userId);
  }
}
