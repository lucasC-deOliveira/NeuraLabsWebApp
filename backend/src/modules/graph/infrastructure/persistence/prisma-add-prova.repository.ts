import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { AddProvaRepository } from '../../domain/ports/add-prova-repository';
import { containNode, createContainedNode } from './node-containment';

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

  // Only creates the PROVA node; the PROVA→QUESTION relationships are derived at
  // render time from the exam's questions (see buildKnowledgeGraph).
  async linkProva(userId: string, grafoId: string, provaId: string): Promise<string> {
    const existing = await this.prisma.nodeConhecimento.findFirst({
      where: { grafoId, tipoNode: 'PROVA', referenciaId: provaId },
      select: { id: true },
    });
    if (existing) {
      await containNode(this.prisma, grafoId, existing.id);
      return existing.id;
    }
    return createContainedNode(this.prisma, {
      usuarioId: userId,
      grafoId,
      tipoNode: 'PROVA',
      referenciaId: provaId,
    });
  }
}
