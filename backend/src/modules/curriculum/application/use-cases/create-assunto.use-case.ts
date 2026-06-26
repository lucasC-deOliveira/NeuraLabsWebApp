import type { CurriculumRepository } from '../../domain/ports/curriculum-repository';
import type { CreatedNode } from '../../domain/curriculum-views';

/**
 * Creates a subject (assunto).
 * @example createAssunto.execute('u1', 'Biologia')
 */
export class CreateAssuntoUseCase {
  constructor(private readonly repo: CurriculumRepository) {}

  execute(userId: string, nome: string): Promise<CreatedNode> {
    return this.repo.createAssunto(userId, nome);
  }
}
