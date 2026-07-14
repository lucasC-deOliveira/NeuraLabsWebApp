import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphRepository } from '../../domain/ports/graph-repository';

@Injectable()
export class PrismaGraphRepository implements GraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string, descricao: string | null): Promise<{ id: string }> {
    const g = await this.prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: name, descricao },
    });
    return { id: g.id };
  }

  async rename(userId: string, grafoId: string, name: string): Promise<void> {
    await this.prisma.grafosConhecimento.updateMany({
      where: { id: grafoId, usuarioId: userId },
      data: { nome: name },
    });
  }
}
