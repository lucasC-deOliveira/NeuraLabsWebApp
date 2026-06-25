import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  DuplicateGraphNode,
  DuplicateNodesRepository,
} from '../../domain/ports/duplicate-nodes-repository';
import { loadStructuralNodes } from './structural-nodes';

@Injectable()
export class PrismaDuplicateNodesRepository implements DuplicateNodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadGraphNodes(userId: string, grafoId: string): Promise<DuplicateGraphNode[]> {
    const nodes = await loadStructuralNodes(this.prisma, userId, grafoId);
    return nodes.map((n) => ({ id: n.id, tipo: n.tipo, nome: n.nome, desc: n.descricao ?? '' }));
  }
}
