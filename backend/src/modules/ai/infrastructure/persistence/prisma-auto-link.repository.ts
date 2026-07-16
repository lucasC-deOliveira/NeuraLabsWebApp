import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { AutoLinkData, AutoLinkRepository } from '../../domain/ports/auto-link-repository';
import type { AutoLinkNode } from '../../domain/services/auto-link-suggestions';
import { loadStructuralNodes, refIdsByType } from './structural-nodes';

@Injectable()
export class PrismaAutoLinkRepository implements AutoLinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadAutoLinkData(userId: string, grafoId: string): Promise<AutoLinkData> {
    const [nodes, existingPairs] = await Promise.all([
      this.loadNodes(userId, grafoId),
      this.loadExistingPairs(userId, grafoId),
    ]);
    return { nodes, existingPairs };
  }

  private async loadNodes(userId: string, grafoId: string): Promise<AutoLinkNode[]> {
    const ids = await refIdsByType(this.prisma, userId, grafoId);
    const [structural, notas] = await Promise.all([
      loadStructuralNodes(this.prisma, userId, grafoId),
      this.prisma.nota.findMany({
        where: { id: { in: ids.NOTA ?? [] } },
        select: { id: true, titulo: true },
      }),
    ]);
    return [
      ...structural.map((n) => ({ id: n.id, tipo: n.tipo, nome: n.nome })),
      ...notas.map((n) => ({ id: n.id, tipo: 'NOTA', nome: n.titulo || 'Nota' })),
    ];
  }

  private async loadExistingPairs(userId: string, grafoId: string): Promise<Set<string>> {
    const [edges, ncNodes] = await Promise.all([
      this.prisma.conhecimentoAresta.findMany({
        where: { grafoId },
        select: { nodeOrigemId: true, nodeDestinoId: true },
      }),
      this.prisma.nodeConhecimento.findMany({
        where: { usuarioId: userId, contidoEm: { some: { grafoId } } },
        select: { id: true, referenciaId: true },
      }),
    ]);
    const refById = new Map(ncNodes.map((n) => [n.id, n.referenciaId]));
    return new Set(
      edges
        .filter((e) => e.nodeOrigemId && e.nodeDestinoId)
        .map((e) => `${refById.get(e.nodeOrigemId ?? '')}:${refById.get(e.nodeDestinoId ?? '')}`),
    );
  }
}
