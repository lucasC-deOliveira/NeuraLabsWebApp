import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PrerequisiteNodesRepository } from '../../domain/ports/prerequisite-nodes-repository';
import type { PrereqNode } from '../../domain/services/missing-prerequisites';
import { loadStructuralNodes } from './structural-nodes';

@Injectable()
export class PrismaPrerequisiteNodesRepository implements PrerequisiteNodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadNodes(userId: string, grafoId: string): Promise<PrereqNode[]> {
    const structural = await loadStructuralNodes(this.prisma, userId, grafoId);
    return structural
      .filter((n) => n.tipo === 'TOPICO' || n.tipo === 'CONCEITO')
      .map((n) => ({ id: n.id, tipo: n.tipo, nome: n.nome }));
  }
}
