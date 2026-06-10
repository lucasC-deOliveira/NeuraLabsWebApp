import type { PrismaClient } from '@/generated/prisma/client'
import type {
  SubjectRepository,
  CreateSubjectData,
  CreateTopicData,
  CreateConceptData,
} from '../domain/ports/subject-repository.port'
import { Subject } from '../domain/entities/subject.entity'
import { Topic } from '../domain/entities/topic.entity'
import { Concept } from '../domain/entities/concept.entity'

export class PrismaSubjectRepository implements SubjectRepository {
  constructor(private readonly db: PrismaClient) {}

  async createSubject(data: CreateSubjectData): Promise<Subject> {
    const record = await this.db.assunto.create({
      data: { nome: data.name, descricao: data.description, usuarioId: data.userId },
    })
    return Subject.create({
      id: record.id,
      name: record.nome,
      description: record.descricao,
      userId: record.usuarioId,
    })
  }

  async listSubjects(userId: string): Promise<Subject[]> {
    const records = await this.db.assunto.findMany({
      where: { usuarioId: userId },
      orderBy: { nome: 'asc' },
    })
    return records.map((r) =>
      Subject.create({ id: r.id, name: r.nome, description: r.descricao, userId: r.usuarioId }),
    )
  }

  async createTopic(data: CreateTopicData): Promise<Topic> {
    const record = await this.db.topico.create({
      data: { nome: data.name, descricao: data.description, usuarioId: data.userId },
    })
    return Topic.create({
      id: record.id,
      name: record.nome,
      description: record.descricao,
      userId: record.usuarioId,
    })
  }

  async listTopics(userId: string): Promise<Topic[]> {
    const records = await this.db.topico.findMany({
      where: { usuarioId: userId },
      orderBy: { nome: 'asc' },
    })
    return records.map((r) =>
      Topic.create({ id: r.id, name: r.nome, description: r.descricao, userId: r.usuarioId }),
    )
  }

  async createConcept(data: CreateConceptData): Promise<Concept> {
    const record = await this.db.conceito.create({
      data: { nome: data.name, descricao: data.description, usuarioId: data.userId },
    })
    return Concept.create({
      id: record.id,
      name: record.nome,
      description: record.descricao,
      userId: record.usuarioId,
    })
  }

  async listConcepts(userId: string): Promise<Concept[]> {
    const records = await this.db.conceito.findMany({
      where: { usuarioId: userId },
      include: { _count: { select: { flashcards: true } } },
      orderBy: { nome: 'asc' },
    })
    return records.map((r) =>
      Concept.create({
        id: r.id,
        name: r.nome,
        description: r.descricao,
        userId: r.usuarioId,
        flashcardCount: r._count.flashcards,
      }),
    )
  }
}
