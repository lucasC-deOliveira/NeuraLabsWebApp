import { Injectable } from '@nestjs/common';
import { TipoNode, TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { QuestaoGraphWriter } from '../../domain/ports/questao-graph-writer';
import type { ConceitoSugerido, QuestaoConceitoLink } from '../../domain/prova';
import {
  containNode,
  createContainedNode,
} from '../../../graph/infrastructure/persistence/node-containment';

// Writes the question→concept relationships into a knowledge graph the way the
// graph view reads them: a QUESTION node per question and a TESTA edge to each
// CONCEITO node. New concepts (conceitoId null) become a Conceito entity + node.
// Nodes/edges are ensured (idempotent) so re-linking never duplicates. Adapter
// over Prisma — the only place provas writes the graph's node/edge tables.
@Injectable()
export class PrismaQuestaoGraphWriter implements QuestaoGraphWriter {
  constructor(private readonly prisma: PrismaService) {}

  async linkQuestoesToGrafo(
    userId: string,
    grafoId: string,
    links: QuestaoConceitoLink[],
  ): Promise<void> {
    // Reuse a concept the classifier proposed for several questions this run.
    const newConceitos = new Map<string, string>();
    for (const link of links) await this.linkQuestao(userId, grafoId, link, newConceitos);
  }

  private async linkQuestao(
    userId: string,
    grafoId: string,
    link: QuestaoConceitoLink,
    newConceitos: Map<string, string>,
  ): Promise<void> {
    const questionNodeId = await this.ensureNode(
      userId,
      grafoId,
      TipoNode.QUESTION,
      link.questaoId,
    );
    for (const conceito of link.conceitos) {
      await this.connect(userId, grafoId, questionNodeId, conceito, newConceitos);
    }
  }

  private async connect(
    userId: string,
    grafoId: string,
    questionNodeId: string,
    conceito: ConceitoSugerido,
    newConceitos: Map<string, string>,
  ): Promise<void> {
    const conceitoId = await this.resolveConceitoId(userId, conceito, newConceitos);
    const conceitoNodeId = await this.ensureNode(userId, grafoId, TipoNode.CONCEITO, conceitoId);
    await this.ensureEdge(grafoId, questionNodeId, conceitoNodeId);
  }

  private async resolveConceitoId(
    userId: string,
    conceito: ConceitoSugerido,
    newConceitos: Map<string, string>,
  ): Promise<string> {
    if (conceito.conceitoId) return conceito.conceitoId;
    const key = conceito.nome.toLowerCase();
    const cached = newConceitos.get(key);
    if (cached) return cached;
    const created = await this.prisma.conceito.create({
      data: { nome: conceito.nome, usuarioId: userId },
      select: { id: true },
    });
    newConceitos.set(key, created.id);
    return created.id;
  }

  private async ensureNode(
    userId: string,
    grafoId: string,
    tipoNode: TipoNode,
    referenciaId: string,
  ): Promise<string> {
    const where = { usuarioId: userId, grafoId, tipoNode, referenciaId };
    const existing = await this.prisma.nodeConhecimento.findFirst({ where, select: { id: true } });
    // O nó pode existir sem a contenção (criado por um caminho antigo); garanti-la é
    // idempotente, e sem ela ele não apareceria na vista do grafo.
    if (existing) {
      await containNode(this.prisma, grafoId, existing.id);
      return existing.id;
    }
    return createContainedNode(this.prisma, { usuarioId: userId, grafoId, tipoNode, referenciaId });
  }

  private async ensureEdge(
    grafoId: string,
    nodeOrigemId: string,
    nodeDestinoId: string,
  ): Promise<void> {
    const where = { nodeOrigemId, nodeDestinoId, tipoRelacao: TipoRelacao.TESTA };
    const existing = await this.prisma.conhecimentoAresta.findFirst({
      where,
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.conhecimentoAresta.create({ data: { grafoId, ...where } });
  }
}
