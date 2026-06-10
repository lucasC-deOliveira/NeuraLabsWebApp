import type { SubjectRepository } from '../../domain/ports/subject-repository.port'

export interface ConceptDTO {
  id: string
  name: string
  description: string | null
  flashcardCount: number
}

export class ListConceptsUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(userId: string): Promise<ConceptDTO[]> {
    const concepts = await this.repository.listConcepts(userId)
    return concepts.map((c) => c.toDTO())
  }
}
