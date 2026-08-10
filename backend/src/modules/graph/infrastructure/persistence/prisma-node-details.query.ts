import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NodeDetails, NodeDetailsQuery } from '../../domain/ports/node-details-query';

type NodeDetailsProjector = (userId: string, refId: string) => Promise<NodeDetails | null>;

@Injectable()
export class PrismaNodeDetailsQuery implements NodeDetailsQuery {
  constructor(private readonly prisma: PrismaService) {}

  findDetails(userId: string, tipoNode: string, refId: string): Promise<NodeDetails | null> {
    const project = this.projectors[tipoNode];
    return project ? project(userId, refId) : Promise.resolve(null);
  }

  // Per-type content projection; each returns null when the entity is missing or
  // not owned by the user.
  private readonly projectors: Record<string, NodeDetailsProjector> = {
    ASSUNTO: async (usuarioId, id) => {
      const a = await this.prisma.assunto.findFirst({ where: { id, usuarioId } });
      return a ? { nome: a.nome, descricao: a.descricao } : null;
    },
    TOPICO: async (usuarioId, id) => {
      const t = await this.prisma.topico.findFirst({ where: { id, usuarioId } });
      return t ? { nome: t.nome, descricao: t.descricao } : null;
    },
    CONCEITO: async (usuarioId, id) => {
      const c = await this.prisma.conceito.findFirst({ where: { id, usuarioId } });
      return c ? { nome: c.nome, descricao: c.descricao } : null;
    },
    FLASHCARD: async (usuarioId, id) => {
      const f = await this.prisma.flashcard.findFirst({ where: { id, usuarioId } });
      return f ? { pergunta: f.pergunta, resposta: f.resposta } : null;
    },
    NOTA: async (usuarioId, id) => {
      const n = await this.prisma.nota.findFirst({ where: { id, usuarioId } });
      if (!n) return null;
      return {
        titulo: n.titulo,
        conteudo: n.conteudo,
        tipoNota: n.tipoNota,
        subtipo: n.subtipo,
        fonte: n.fonte,
      };
    },
    TEXTO_BRUTO: async (usuarioId, id) => {
      const t = await this.prisma.textoBruto.findFirst({ where: { id, usuarioId } });
      return t ? { titulo: t.titulo, texto: t.texto } : null;
    },
    BARALHO: async (usuarioId, id) => {
      const b = await this.prisma.baralho.findFirst({ where: { id, usuarioId } });
      return b ? { titulo: b.titulo } : null;
    },
    // `tipoQuestao`, not `tipo`: the export spreads this projection over the node
    // (export-graph.use-case), so a `tipo` key here overwrote the NODE's type —
    // a question left the Pull as `tipo: MULTIPLA_ESCOLHA` instead of `QUESTION`.
    QUESTION: async (usuarioId, id) => {
      const q = await this.prisma.questao.findFirst({ where: { id, usuarioId } });
      if (!q) return null;
      return {
        enunciado: q.enunciado,
        alternativas: q.alternativas ?? [],
        tipoQuestao: q.tipo,
        gabarito: q.gabarito,
        explicacao: q.explicacao,
      };
    },
    PROVA: async (usuarioId, id) => {
      const p = await this.prisma.prova.findFirst({
        where: { id, usuarioId },
        include: { _count: { select: { questoes: true } } },
      });
      return p
        ? { titulo: p.titulo, descricao: p.descricao, totalQuestoes: p._count.questoes }
        : null;
    },
  };
}
