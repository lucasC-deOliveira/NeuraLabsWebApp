import type { Subject } from '../entities/subject.entity'
import type { Topic } from '../entities/topic.entity'
import type { Concept } from '../entities/concept.entity'

export interface CreateSubjectData {
  name: string
  description: string | null
  userId: string
}

export interface CreateTopicData {
  name: string
  description: string | null
  userId: string
  subjectId?: string
}

export interface CreateConceptData {
  name: string
  description: string | null
  userId: string
  topicId?: string
}

export interface SubjectRepository {
  createSubject(data: CreateSubjectData): Promise<Subject>
  listSubjects(userId: string): Promise<Subject[]>

  createTopic(data: CreateTopicData): Promise<Topic>
  listTopics(userId: string): Promise<Topic[]>

  createConcept(data: CreateConceptData): Promise<Concept>
  listConcepts(userId: string): Promise<Concept[]>
}
