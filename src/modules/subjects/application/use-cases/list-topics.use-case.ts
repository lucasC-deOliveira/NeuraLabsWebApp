import type { SubjectRepository } from '../../domain/ports/subject-repository.port'

export interface TopicDTO {
  id: string
  name: string
  description: string | null
}

export class ListTopicsUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(userId: string): Promise<TopicDTO[]> {
    const topics = await this.repository.listTopics(userId)
    return topics.map((t) => t.toDTO())
  }
}
