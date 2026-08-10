import { Injectable } from '@nestjs/common';
import { TipoNode, TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ConceitoImportanceSource } from '../../domain/ports/conceito-importance-source';
import type { ImportanceRow } from '../../domain/services/conceito-importance';

interface ConceitoNode {
  id: string;
  referenciaId: string;
  // Só existe quando a leitura é de um grafo: o peso é da contenção, não do nó.
  pesoEdital?: number | null;
}

// Loads, per CONCEITO node of a graph, its parent topic (by referenciaId) and how
// many TESTA edges (past questions) point at it. Reads the graph node/edge tables
// directly (ACL for the importance-source port).
@Injectable()
export class PrismaConceitoImportanceRepository implements ConceitoImportanceSource {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Linhas de importância dos conceitos. Sem `grafoId`, ranqueia TODOS os conceitos
   * do usuário numa escala só — é o que a sessão de estudo quer, já que o card não
   * pertence mais a um grafo. Com `grafoId`, só os daquela vista (o roadmap é de um
   * grafo).
   * @example load('u1') // global | load('u1', 'g1') // só a vista g1
   */
  async load(userId: string, grafoId?: string, provaId?: string): Promise<ImportanceRow[]> {
    const nodes = await this.conceitoNodes(userId, grafoId);
    if (nodes.length === 0) return [];
    const nodeIds = nodes.map((n) => n.id);
    const origem =
      grafoId && provaId ? await this.provaQuestionNodeIds(grafoId, provaId) : undefined;
    const [nome, parentTopico, provaFreq] = await Promise.all([
      this.conceitoNames(nodes),
      this.parentTopicoRefs(nodeIds),
      this.testaCounts(nodeIds, origem),
    ]);
    return nodes.map((n) => ({
      conceitoId: n.referenciaId,
      nome: nome.get(n.referenciaId) ?? n.referenciaId,
      topicoId: parentTopico.get(n.id) ?? null,
      provaFreq: provaFreq.get(n.id) ?? 0,
      pesoEdital: n.pesoEdital ?? null,
    }));
  }

  // O peso de edital vem junto quando há grafo. Na leitura global não vem: o peso
  // é de um edital específico, e somar pesos de concursos diferentes numa escala
  // só não quer dizer nada.
  private async conceitoNodes(userId: string, grafoId?: string): Promise<ConceitoNode[]> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: TipoNode.CONCEITO,
        ...(grafoId ? { contidoEm: { some: { grafoId } } } : {}),
      },
      select: {
        id: true,
        referenciaId: true,
        ...(grafoId ? { contidoEm: { where: { grafoId }, select: { pesoEdital: true } } } : {}),
      },
    });
    return nodes.map((n) => ({
      id: n.id,
      referenciaId: n.referenciaId,
      pesoEdital: 'contidoEm' in n ? (n.contidoEm[0]?.pesoEdital ?? null) : null,
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
      where: {
        tipoNode: TipoNode.QUESTION,
        referenciaId: { in: questaoIds },
        contidoEm: { some: { grafoId } },
      },
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
  //
  // A aresta não é mais filtrada por grafo: os nós já delimitam o escopo, e a aresta
  // é um fato entre eles, não propriedade de uma vista.
  private async parentTopicoRefs(nodeIds: string[]): Promise<Map<string, string>> {
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { tipoRelacao: TipoRelacao.PERTENCE_A, nodeOrigemId: { in: nodeIds } },
      select: { nodeOrigemId: true, nodeDestino: { select: { referenciaId: true } } },
    });
    const byNode = new Map<string, string>();
    for (const e of edges) {
      if (e.nodeOrigemId && e.nodeDestino) byNode.set(e.nodeOrigemId, e.nodeDestino.referenciaId);
    }
    return byNode;
  }

  // Quantas questões testam cada conceito. Sem filtro de grafo: uma questão de
  // outro grafo que testa este conceito CONTA — é o fim do silo, e o ponto da
  // migração.
  private async testaCounts(
    nodeIds: string[],
    origemNodeIds?: string[],
  ): Promise<Map<string, number>> {
    const groups = await this.prisma.conhecimentoAresta.groupBy({
      by: ['nodeDestinoId'],
      where: {
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
