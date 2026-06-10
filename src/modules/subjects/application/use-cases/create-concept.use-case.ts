import type { SubjectRepository } from '../../domain/ports/subject-repository.port'

export interface CreateConceptInput {
  name: string
  description?: string
  userId: string
}

export class CreateConceptUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(input: CreateConceptInput): Promise<{ id: string }> {
    const concept = await this.repository.createConcept({
      name: input.name,
      description: input.description ?? null,
      userId: input.userId,
    })
    return { id: concept.id }
  }
}
