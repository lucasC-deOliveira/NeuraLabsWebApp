import type { NotaRepository } from '../../domain/ports/nota-repository';
import type { CreateNotaInput } from '../../domain/note-views';

/**
 * Creates a note. Graph relations are added later via the graph UI.
 * @example createNota.execute('u1', { titulo, conteudo })
 */
export class CreateNotaUseCase {
  constructor(private readonly repo: NotaRepository) {}

  async execute(userId: string, input: CreateNotaInput): Promise<{ notaId: string }> {
    return { notaId: await this.repo.createNota(userId, input) };
  }
}
