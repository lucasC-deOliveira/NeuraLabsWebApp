import { Injectable } from '@nestjs/common';
import { TipoNode, TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { EditalCoverageSource } from '../../domain/ports/edital-coverage-source';

// Reads COBRE edges (EDITAL → CONCEITO) of a graph and maps each target node to its
// concept referenciaId, giving the set of concepts the graph's editais cover.
@Injectable()
export class PrismaEditalCoverageRepository implements EditalCoverageSource {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string, grafoId: string, editalId?: string): Promise<Set<string>> {
    const origem = editalId ? { referenciaId: editalId, tipoNode: TipoNode.EDITAL } : undefined;
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { grafoId, tipoRelacao: TipoRelacao.COBRE, ...(origem ? { nodeOrigem: origem } : {}) },
      select: { nodeDestino: { select: { referenciaId: true, usuarioId: true } } },
    });
    const covered = new Set<string>();
    for (const e of edges) {
      if (e.nodeDestino && e.nodeDestino.usuarioId === userId)
        covered.add(e.nodeDestino.referenciaId);
    }
    return covered;
  }
}
