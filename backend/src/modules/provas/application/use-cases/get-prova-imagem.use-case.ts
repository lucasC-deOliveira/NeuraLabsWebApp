import { assertOwner } from '../../domain/errors';
import type { ProvaRepository } from '../../domain/ports/prova-repository';

export interface QuestaoImagemBytes {
  mimetype: string;
  dados: Buffer;
}

/**
 * Loads a stored question figure's bytes, asserting the caller owns the exam.
 * @example getProvaImagem.execute('u1', 'imagem-id')
 */
export class GetProvaImagemUseCase {
  constructor(private readonly repo: ProvaRepository) {}

  async execute(userId: string, id: string): Promise<QuestaoImagemBytes> {
    const found = await this.repo.findImagem(id);
    assertOwner(found, userId);
    return { mimetype: found.mimetype, dados: found.dados };
  }
}
