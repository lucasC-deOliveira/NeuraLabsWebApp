import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  InsightTargetContext,
  InsightTargetIndexRepository,
} from '../../domain/ports/insight-target-index-repository';
import { loadStructuralNodes } from './structural-nodes';

@Injectable()
export class PrismaInsightTargetIndexRepository implements InsightTargetIndexRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadInsightTargetContext(
    userId: string,
    grafoId: string,
    sourceNodeId: string,
  ): Promise<InsightTargetContext | null> {
    const source = await this.prisma.nodeConhecimento.findFirst({
      where: { grafoId, usuarioId: userId, referenciaId: sourceNodeId },
      select: { tipoNode: true },
    });
    if (!source) return null;
    const structural = await loadStructuralNodes(this.prisma, userId, grafoId);
    const nameIndex = new Map<string, string>();
    for (const n of structural) nameIndex.set(`${n.tipo}|${n.nome.toLowerCase()}`, n.id);
    return { sourceType: source.tipoNode, nameIndex };
  }
}
