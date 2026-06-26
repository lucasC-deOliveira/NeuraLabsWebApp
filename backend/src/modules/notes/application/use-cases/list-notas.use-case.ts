import type { NotaQuery } from '../../domain/ports/nota-query';
import type { NotaListItem } from '../../domain/note-views';

/**
 * Lists the user's notes with preview, related concepts and flashcard counts.
 * @example listNotas.execute('u1')
 */
export class ListNotasUseCase {
  constructor(private readonly query: NotaQuery) {}

  execute(userId: string): Promise<NotaListItem[]> {
    return this.query.listNotas(userId);
  }
}
