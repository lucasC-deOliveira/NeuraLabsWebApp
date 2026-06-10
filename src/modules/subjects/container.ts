import { prismaClient } from '@/shared/infrastructure/database/prisma.client'
import { PrismaSubjectRepository } from './infrastructure/prisma-subject-repository.adapter'
import { CreateSubjectUseCase } from './application/use-cases/create-subject.use-case'
import { ListSubjectsUseCase } from './application/use-cases/list-subjects.use-case'
import { CreateTopicUseCase } from './application/use-cases/create-topic.use-case'
import { ListTopicsUseCase } from './application/use-cases/list-topics.use-case'
import { CreateConceptUseCase } from './application/use-cases/create-concept.use-case'
import { ListConceptsUseCase } from './application/use-cases/list-concepts.use-case'

const repository = new PrismaSubjectRepository(prismaClient)

export const subjectsContainer = {
  createSubject: new CreateSubjectUseCase(repository),
  listSubjects: new ListSubjectsUseCase(repository),
  createTopic: new CreateTopicUseCase(repository),
  listTopics: new ListTopicsUseCase(repository),
  createConcept: new CreateConceptUseCase(repository),
  listConcepts: new ListConceptsUseCase(repository),
}
