import { Injectable } from '@nestjs/common';
import { TipoNode, TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ConceitoImportanceSource } from '../../domain/ports/conceito-importance-source';
import type { ImportanceRow } from '../../domain/services/conceito-importance';

interface ConceitoNode {
  id: string;
  referenciaId: string;
}

// Loads, per CONCEITO node of a graph, its parent topic (by referenciaId) and how
// many TESTA edges (past questions) point at it. Reads the graph node/edge tables
// directly (ACL for the importance-source port).
@Injectable()
export class PrismaConceitoImportanceRepository implements ConceitoImportanceSource {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string, grafoId: string, provaId?: string): Promise<ImportanceRow[]> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId, tipoNode: TipoNode.CONCEITO },
      select: { id: true, referenciaId: true },
    });
    if (nodes.length === 0) return [];
    const nodeIds = nodes.map((n) => n.id);
    const origem = provaId ? await this.provaQuestionNodeIds(grafoId, provaId) : undefined;
    const [nome, parentTopico, provaFreq] = await Promise.all([
      this.conceitoNames(nodes),
      this.parentTopicoRefs(grafoId, nodeIds),
      this.testaCounts(grafoId, nodeIds, origem),
    ]);
    return nodes.map((n) => ({
      conceitoId: n.referenciaId,
      nome: nome.get(n.referenciaId) ?? n.referenciaId,
      topicoId: parentTopico.get(n.id) ?? null,
      provaFreq: provaFreq.get(n.id) ?? 0,
    }));
  }

  // QUESTION node ids of the given exam's questions, to scope the TESTA counts.
  private async provaQuestionNodeIds(grafoId: string, provaId: string): Promise<string[]> {
    const links = await this.prisma.provaQuestao.findMany({
      where: { provaId },
      select: { questaoId: true },
    });
    const questaoIds = links.map((l) => l.questaoId);
    if (questaoIds.length === 0) return [];
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId, tipoNode: TipoNode.QUESTION, referenciaId: { in: questaoIds } },
      select: { id: true },
    });
    return nodes.map((n) => n.id);
  }

  private async conceitoNames(nodes: ConceitoNode[]): Promise<Map<string, string>> {
    const conceitos = await this.prisma.conceito.findMany({
      where: { id: { in: nodes.map((n) => n.referenciaId) } },
      select: { id: true, nome: true },
    });
    return new Map(conceitos.map((c) => [c.id, c.nome]));
  }

  // Maps each concept node id to its parent TOPIC's referenciaId (via PERTENCE_A).
  private async parentTopicoRefs(grafoId: string, nodeIds: string[]): Promise<Map<string, string>> {
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { grafoId, tipoRelacao: TipoRelacao.PERTENCE_A, nodeOrigemId: { in: nodeIds } },
      select: { nodeOrigemId: true, nodeDestino: { select: { referenciaId: true } } },
    });
    const byNode = new Map<string, string>();
    for (const e of edges) {
      if (e.nodeOrigemId && e.nodeDestino) byNode.set(e.nodeOrigemId, e.nodeDestino.referenciaId);
    }
    return byNode;
  }

  private async testaCounts(
    grafoId: string,
    nodeIds: string[],
    origemNodeIds?: string[],
  ): Promise<Map<string, number>> {
    const groups = await this.prisma.conhecimentoAresta.groupBy({
      by: ['nodeDestinoId'],
      where: {
        grafoId,
        tipoRelacao: TipoRelacao.TESTA,
        nodeDestinoId: { in: nodeIds },
        ...(origemNodeIds ? { nodeOrigemId: { in: origemNodeIds } } : {}),
      },
      _count: { _all: true },
    });
    const counts = new Map<string, number>();
    for (const g of groups) if (g.nodeDestinoId) counts.set(g.nodeDestinoId, g._count._all);
    return counts;
  }
}
