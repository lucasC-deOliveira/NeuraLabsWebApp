import type { CurriculumRepository } from '../../domain/ports/curriculum-repository';
import type { CreateConceptInput, CreatedNode } from '../../domain/curriculum-views';

/**
 * Creates a concept under a topic the user owns.
 * @example createConcept.execute('u1', { nome, assuntoId, topicoId })
 */
export class CreateConceptUseCase {
  constructor(private readonly repo: CurriculumRepository) {}

  execute(userId: string, input: CreateConceptInput): Promise<CreatedNode> {
    return this.repo.createConceito(userId, input);
  }
}
