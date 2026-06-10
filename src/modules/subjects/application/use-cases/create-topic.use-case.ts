import type { SubjectRepository } from '../../domain/ports/subject-repository.port'

export interface CreateTopicInput {
  name: string
  description?: string
  userId: string
}

export class CreateTopicUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(input: CreateTopicInput): Promise<{ id: string }> {
    const topic = await this.repository.createTopic({
      name: input.name,
      description: input.description ?? null,
      userId: input.userId,
    })
    return { id: topic.id }
  }
}
