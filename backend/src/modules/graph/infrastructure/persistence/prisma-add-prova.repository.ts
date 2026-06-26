import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { AddProvaRepository } from '../../domain/ports/add-prova-repository';

@Injectable()
export class PrismaAddProvaRepository implements AddProvaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async graphExists(grafoId: string, userId: string): Promise<boolean> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return g !== null;
  }

  async provaExists(provaId: string, userId: string): Promise<boolean> {
    const prova = await this.prisma.prova.findFirst({
      where: { id: provaId, usuarioId: userId },
      select: { id: true },
    });
    return prova !== null;
  }

  async linkProva(userId: string, grafoId: string, provaId: string): Promise<string> {
    const existing = await this.prisma.nodeConhecimento.findFirst({
      where: { grafoId, tipoNode: 'PROVA', referenciaId: provaId },
      select: { id: true },
    });
    if (existing) return existing.id;
    const node = await this.prisma.nodeConhecimento.create({
      data: { grafoId, tipoNode: 'PROVA', referenciaId: provaId, usuarioId: userId },
    });
    return node.id;
  }
}
