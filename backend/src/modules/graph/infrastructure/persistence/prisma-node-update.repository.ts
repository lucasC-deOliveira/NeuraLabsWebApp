import { Injectable } from '@nestjs/common';
import { type SubtipoNota } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NodeUpdateRepository } from '../../domain/ports/node-update-repository';
import type { NodeUpdateData } from '../../domain/services/node-update';

type EntityScope = { id: string; usuarioId: string };
type EntityUpdater = (where: EntityScope, data: NodeUpdateData) => Promise<number>;

@Injectable()
export class PrismaNodeUpdateRepository implements NodeUpdateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateNode(
    userId: string,
    tipoNode: string,
    refId: string,
    data: NodeUpdateData,
  ): Promise<{ updated: number }> {
    const update = this.updaters[tipoNode];
    const updated = update ? await update({ id: refId, usuarioId: userId }, data) : 0;
    return { updated };
  }

  async touchNodes(userId: string, refId: string): Promise<void> {
    await this.prisma.nodeConhecimento.updateMany({
      where: { referenciaId: refId, usuarioId: userId },
      data: { ultimaAtualizacao: new Date() },
    });
  }

  // Per-type entity update; the use-case has already validated the type/subtype.
  private readonly updaters: Record<string, EntityUpdater> = {
    ASSUNTO: async (where, data) =>
      (await this.prisma.assunto.updateMany({ where, data: named(data) })).count,
    TOPICO: async (where, data) =>
      (await this.prisma.topico.updateMany({ where, data: named(data) })).count,
    CONCEITO: async (where, data) =>
      (await this.prisma.conceito.updateMany({ where, data: named(data) })).count,
    FLASHCARD: async (where, data) =>
      (
        await this.prisma.flashcard.updateMany({
          where,
          data: { pergunta: data.pergunta, resposta: data.resposta },
        })
      ).count,
    NOTA: async (where, data) =>
      (
        await this.prisma.nota.updateMany({
          where,
          data: {
            titulo: data.titulo?.trim(),
            conteudo: data.conteudo,
            tipoNota: data.tipoNota,
            subtipo: data.subtipo as SubtipoNota | undefined,
            fonte: data.fonte === undefined ? undefined : data.fonte?.trim() || null,
          },
        })
      ).count,
    TEXTO_BRUTO: async (where, data) =>
      (
        await this.prisma.textoBruto.updateMany({
          where,
          data: { titulo: data.titulo?.trim(), texto: data.texto?.trim() },
        })
      ).count,
  };
}

// Shared name/description patch for the structural types (ASSUNTO/TOPICO/CONCEITO).
function named(data: NodeUpdateData): { nome?: string; descricao?: string | null } {
  return { nome: data.nome, descricao: data.descricao };
}
