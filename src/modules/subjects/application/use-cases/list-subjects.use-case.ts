import type { SubjectRepository } from '../../domain/ports/subject-repository.port'

export interface SubjectDTO {
  id: string
  name: string
  description: string | null
}

export class ListSubjectsUseCase {
  constructor(private readonly repository: SubjectRepository) {}

  async execute(userId: string): Promise<SubjectDTO[]> {
    const subjects = await this.repository.listSubjects(userId)
    return subjects.map((s) => s.toDTO())
  }
}
