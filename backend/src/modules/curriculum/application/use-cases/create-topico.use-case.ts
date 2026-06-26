import type { CurriculumRepository } from '../../domain/ports/curriculum-repository';
import type { CreatedNode } from '../../domain/curriculum-views';

/**
 * Creates a topic under a subject the user owns.
 * @example createTopico.execute('u1', 'Célula', 'assunto1')
 */
export class CreateTopicoUseCase {
  constructor(private readonly repo: CurriculumRepository) {}

  execute(userId: string, nome: string, assuntoId: string): Promise<CreatedNode> {
    return this.repo.createTopico(userId, nome, assuntoId);
  }
}
