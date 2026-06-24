import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphRepository } from '../../domain/ports/graph-repository';

@Injectable()
export class PrismaGraphRepository implements GraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string, descricao: string | null): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      const g = await tx.grafosConhecimento.create({
        data: { usuarioId: userId, nome: name, descricao },
      });
      const rootId = await this.createRootSubject(tx, userId, g.id, name);
      await tx.grafosConhecimento.update({
        where: { id: g.id },
        data: { rootAssuntoId: rootId },
      });
      return { id: g.id };
    });
  }

  // Root subject: an ASSUNTO named after the graph, pinned at center (0,0),
  // anchors the layout. Returns the subject id to link back as rootAssuntoId.
  private async createRootSubject(
    tx: Prisma.TransactionClient,
    userId: string,
    grafoId: string,
    name: string,
  ): Promise<string> {
    const root = await tx.assunto.create({ data: { nome: name, usuarioId: userId } });
    await tx.nodeConhecimento.create({
      data: {
        usuarioId: userId,
        grafoId,
        tipoNode: 'ASSUNTO',
        referenciaId: root.id,
        posicaoX: 0,
        posicaoY: 0,
      },
    });
    return root.id;
  }

  async rename(userId: string, grafoId: string, name: string): Promise<void> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { rootAssuntoId: true },
    });
    await this.prisma.grafosConhecimento.updateMany({
      where: { id: grafoId, usuarioId: userId },
      data: { nome: name },
    });
    // The root subject's name mirrors the graph name.
    if (g?.rootAssuntoId) {
      await this.prisma.assunto.updateMany({
        where: { id: g.rootAssuntoId, usuarioId: userId },
        data: { nome: name },
      });
    }
  }
}
