import { Injectable } from '@nestjs/common';
import { TipoNode, TipoRelacao } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { EditalRepository } from '../../domain/ports/edital-repository';
import type { CreateEditalInput, Edital } from '../../domain/prova';
import { EditalAlreadyLinkedError, ProvaAlreadyHasEditalError } from '../../domain/errors';
import {
  containNode,
  createContainedNode,
} from '../../../graph/infrastructure/persistence/node-containment';

// Persists editais and their 1:1 link to a prova, materializing the EDITAL node
// and a REGE edge to the prova's node. Mirrors the graph node/edge writes done by
// PrismaQuestaoGraphWriter; idempotent (ensure-node/ensure-edge).
@Injectable()
export class PrismaEditalRepository implements EditalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateEditalInput): Promise<{ editalId: string }> {
    if (input.provaId) await this.assertProvaFree(input.provaId);
    const edital = await this.prisma.edital.create({
      data: {
        usuarioId: userId,
        titulo: input.titulo,
        programa: input.programa,
        provaId: input.provaId ?? null,
      },
      select: { id: true },
    });
    const editalNode = await this.ensureNode(userId, input.grafoId, TipoNode.EDITAL, edital.id);
    if (input.provaId) await this.linkNodes(userId, input.grafoId, editalNode, input.provaId);
    await this.linkConceitos(userId, input.grafoId, editalNode, input.conceitoNodeIds ?? []);
    return { editalId: edital.id };
  }

  async linkToProva(
    userId: string,
    editalId: string,
    provaId: string,
    grafoId: string,
  ): Promise<void> {
    const edital = await this.prisma.edital.findFirst({
      where: { id: editalId, usuarioId: userId },
      select: { provaId: true },
    });
    if (edital?.provaId) throw new EditalAlreadyLinkedError();
    await this.assertProvaFree(provaId);
    await this.prisma.edital.update({ where: { id: editalId }, data: { provaId } });
    const editalNode = await this.ensureNode(userId, grafoId, TipoNode.EDITAL, editalId);
    await this.linkNodes(userId, grafoId, editalNode, provaId);
  }

  async listByUser(userId: string): Promise<Edital[]> {
    const rows = await this.prisma.edital.findMany({
      where: { usuarioId: userId },
      select: { id: true, titulo: true, provaId: true },
      orderBy: { dataCriacao: 'desc' },
    });
    return rows.map((e) => ({ id: e.id, titulo: e.titulo, provaId: e.provaId }));
  }

  private async assertProvaFree(provaId: string): Promise<void> {
    const existing = await this.prisma.edital.findUnique({
      where: { provaId },
      select: { id: true },
    });
    if (existing) throw new ProvaAlreadyHasEditalError();
  }

  private async linkNodes(
    userId: string,
    grafoId: string,
    editalNodeId: string,
    provaId: string,
  ): Promise<void> {
    const provaNode = await this.ensureNode(userId, grafoId, TipoNode.PROVA, provaId);
    await this.ensureEdge(grafoId, editalNodeId, provaNode, TipoRelacao.REGE);
  }

  // Links the EDITAL node to each concept it covers (COBRE edge, idempotent). The ids
  // are concept referenciaIds (as returned by the graph build), so each is resolved to
  // its CONCEITO node before the edge — writing referenciaId as an edge endpoint would
  // violate the node FK.
  private async linkConceitos(
    userId: string,
    grafoId: string,
    editalNodeId: string,
    conceitoRefIds: string[],
  ): Promise<void> {
    for (const refId of conceitoRefIds) {
      const conceitoNode = await this.ensureNode(userId, grafoId, TipoNode.CONCEITO, refId);
      await this.ensureEdge(grafoId, editalNodeId, conceitoNode, TipoRelacao.COBRE);
    }
  }

  private async ensureNode(
    userId: string,
    grafoId: string,
    tipoNode: TipoNode,
    referenciaId: string,
  ): Promise<string> {
    const existing = await this.prisma.nodeConhecimento.findFirst({
      where: { usuarioId: userId, tipoNode, referenciaId, contidoEm: { some: { grafoId } } },
      select: { id: true },
    });
    // Idem ao writer de questões: o nó pode existir sem a contenção, e sem ela ele
    // não apareceria na vista do grafo.
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
    tipoRelacao: TipoRelacao,
  ): Promise<void> {
    const where = { nodeOrigemId, nodeDestinoId, tipoRelacao };
    const existing = await this.prisma.conhecimentoAresta.findFirst({
      where,
      select: { id: true },
    });
    if (existing) return;
    await this.prisma.conhecimentoAresta.create({ data: where });
  }
}
