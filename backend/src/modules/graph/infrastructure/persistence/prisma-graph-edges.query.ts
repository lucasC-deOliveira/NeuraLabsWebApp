import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphEdgesQuery, GraphEdgeView } from '../../domain/ports/graph-edges-query';

type EdgeWithNodes = Prisma.ConhecimentoArestaGetPayload<{
  include: { nodeOrigem: true; nodeDestino: true };
}>;
type NodeLabeler = (refId: string) => Promise<string>;

@Injectable()
export class PrismaGraphEdgesQuery implements GraphEdgesQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listForGraph(userId: string, grafoId: string): Promise<GraphEdgeView[]> {
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { grafoId },
      include: { nodeOrigem: true, nodeDestino: true },
    });
    const owned = edges.filter(
      (e) => e.nodeOrigem?.usuarioId === userId && e.nodeDestino?.usuarioId === userId,
    );
    return Promise.all(owned.map((e) => this.toEdgeView(e)));
  }

  private async toEdgeView(e: EdgeWithNodes): Promise<GraphEdgeView> {
    const origem = e.nodeOrigem!;
    const destino = e.nodeDestino!;
    return {
      id: e.id,
      source: origem.referenciaId,
      target: destino.referenciaId,
      tipoRelacao: e.tipoRelacao,
      peso: e.peso,
      sourceLabel: await this.label(origem.tipoNode, origem.referenciaId),
      targetLabel: await this.label(destino.tipoNode, destino.referenciaId),
    };
  }

  // Short display label for a node, falling back to its referenciaId.
  private async label(tipoNode: string, refId: string): Promise<string> {
    const labeler = this.labelers[tipoNode];
    return labeler ? labeler(refId) : refId;
  }

  private readonly labelers: Record<string, NodeLabeler> = {
    ASSUNTO: async (id) => (await this.prisma.assunto.findUnique({ where: { id } }))?.nome ?? id,
    TOPICO: async (id) => (await this.prisma.topico.findUnique({ where: { id } }))?.nome ?? id,
    CONCEITO: async (id) => (await this.prisma.conceito.findUnique({ where: { id } }))?.nome ?? id,
    FLASHCARD: async (id) => {
      const f = await this.prisma.flashcard.findUnique({ where: { id } });
      return f?.pergunta?.slice(0, 50) ?? id;
    },
    NOTA: async (id) => {
      const n = await this.prisma.nota.findUnique({ where: { id } });
      return n?.titulo && n.titulo !== 'Sem título' ? n.titulo : (n?.conteudo?.slice(0, 50) ?? id);
    },
    TEXTO_BRUTO: async (id) => {
      const t = await this.prisma.textoBruto.findUnique({ where: { id } });
      return t?.titulo && t.titulo !== 'Texto sem título'
        ? t.titulo
        : (t?.texto?.slice(0, 50) ?? id);
    },
    BARALHO: async (id) => (await this.prisma.baralho.findUnique({ where: { id } }))?.titulo ?? id,
    PROVA: async (id) => (await this.prisma.prova.findUnique({ where: { id } }))?.titulo ?? id,
  };
}
