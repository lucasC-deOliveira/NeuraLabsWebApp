import type { PrismaClient } from '@/generated/prisma/client'
import type { UserRepository, CreateUserData } from '../domain/ports/user-repository.port'
import { User } from '../domain/entities/user.entity'

type UserRecord = {
  id: string
  nome: string
  email: string
  senhaHash: string
  dataCriacao: Date
  ultimoAcesso: Date | null
}

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.db.usuario.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, senhaHash: true, dataCriacao: true, ultimoAcesso: true },
    })
    return record ? this.toEntity(record) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.db.usuario.findUnique({
      where: { email },
      select: { id: true, nome: true, email: true, senhaHash: true, dataCriacao: true, ultimoAcesso: true },
    })
    return record ? this.toEntity(record) : null
  }

  async create(data: CreateUserData): Promise<User> {
    const record = await this.db.usuario.create({
      data: { nome: data.name, email: data.email, senhaHash: data.passwordHash },
      select: { id: true, nome: true, email: true, senhaHash: true, dataCriacao: true, ultimoAcesso: true },
    })
    return this.toEntity(record)
  }

  async updateLastAccess(id: string): Promise<void> {
    await this.db.usuario.update({ where: { id }, data: { ultimoAcesso: new Date() } })
  }

  private toEntity(record: UserRecord): User {
    return User.create({
      id: record.id,
      name: record.nome,
      email: record.email,
      passwordHash: record.senhaHash,
      createdAt: record.dataCriacao,
      lastAccessAt: record.ultimoAcesso,
    })
  }
}
