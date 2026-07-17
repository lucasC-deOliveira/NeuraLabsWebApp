import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NodeTypesRepository } from '../../domain/ports/node-types-repository';

@Injectable()
export class PrismaNodeTypesRepository implements NodeTypesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadNodeTypes(
    userId: string,
    grafoId: string,
    refIds: string[],
  ): Promise<Map<string, string>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, referenciaId: { in: refIds }, contidoEm: { some: { grafoId } } },
      select: { referenciaId: true, tipoNode: true },
    });
    return new Map(nodes.map((n) => [n.referenciaId, n.tipoNode]));
  }
}
