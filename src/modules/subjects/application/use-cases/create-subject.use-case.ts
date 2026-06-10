import type { SubjectRepository } from '../../domain/ports/subject-repository.port'

export interface CreateSubjectInput {
  name: string
  description?: string
  userId: string
}

export class CreateSubjectUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(input: CreateSubjectInput): Promise<{ id: string }> {
    const subject = await this.repository.createSubject({
      name: input.name,
      description: input.description ?? null,
      userId: input.userId,
    })
    return { id: subject.id }
  }
}
