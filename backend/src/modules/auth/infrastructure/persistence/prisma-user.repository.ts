import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NewUser, UserRepository } from '../../domain/ports/user-repository';
import type { AuthenticatedUser, UserCredentials } from '../../domain/user';

const PUBLIC_SELECT = { id: true, nome: true, email: true } as const;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserCredentials | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: { ...PUBLIC_SELECT, senhaHash: true },
    });
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    return this.prisma.usuario.findUnique({ where: { id }, select: PUBLIC_SELECT });
  }

  async create(user: NewUser): Promise<AuthenticatedUser> {
    return this.prisma.usuario.create({ data: user, select: PUBLIC_SELECT });
  }

  async touchLastAccess(id: string): Promise<void> {
    await this.prisma.usuario.update({ where: { id }, data: { ultimoAcesso: new Date() } });
  }
}
