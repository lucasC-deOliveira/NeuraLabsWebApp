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

  // O master é o único grafo sem pai. O orderBy é uma rede de segurança: se por
  // algum caminho antigo houver mais de um raiz, elege o maior (e o mais antigo no
  // empate) como master, em vez de escolher ao acaso.
  async findRootId(userId: string): Promise<string | null> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { usuarioId: userId, parentGrafoId: null },
      orderBy: [{ grafoNodes: { _count: 'desc' } }, { dataCriacao: 'asc' }],
      select: { id: true },
    });
    return g?.id ?? null;
  }
}
