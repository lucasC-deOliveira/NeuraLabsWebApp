import { Injectable } from '@nestjs/common';
import { type SubtipoNota, type TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NodeCreationRepository } from '../../domain/ports/node-creation-repository';
import type { CreateNodeInput } from '../../domain/services/node-creation';

type EntityCreator = (userId: string, input: CreateNodeInput, now: Date) => Promise<string>;

@Injectable()
export class PrismaNodeCreationRepository implements NodeCreationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async graphExists(grafoId: string, userId: string): Promise<boolean> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return g !== null;
  }

  async createNode(
    userId: string,
    grafoId: string,
    input: CreateNodeInput,
  ): Promise<{ nodeId: string }> {
    const now = new Date();
    const entityId = await this.entityCreators[input.tipoNode](userId, input, now);
    await this.prisma.nodeConhecimento.create({
      data: {
        grafoId,
        tipoNode: input.tipoNode as TipoNode,
        referenciaId: entityId,
        usuarioId: userId,
        posicaoX: input.posicaoX ?? null,
        posicaoY: input.posicaoY ?? null,
        nivelDominio: input.nivelDominio ?? 0,
      },
    });
    return { nodeId: entityId };
  }

  // Per-type entity creation; the use-case has already validated the input.
  private readonly entityCreators: Record<string, EntityCreator> = {
    FLASHCARD: async (userId, input, now) =>
      (
        await this.prisma.flashcard.create({
          data: {
            pergunta: input.pergunta ?? '',
            resposta: input.resposta ?? '',
            usuarioId: userId,
            dataCriacao: now,
          },
        })
      ).id,
    NOTA: async (userId, input, now) => this.createNota(userId, input, now),
    TEXTO_BRUTO: async (userId, input, now) =>
      (
        await this.prisma.textoBruto.create({
          data: {
            titulo: input.titulo?.trim() || 'Texto sem título',
            texto: (input.texto ?? '').trim(),
            usuarioId: userId,
            dataCriacao: now,
          },
        })
      ).id,
    ASSUNTO: async (userId, input) =>
      (
        await this.prisma.assunto.create({
          data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId },
        })
      ).id,
    TOPICO: async (userId, input) =>
      (
        await this.prisma.topico.create({
          data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId },
        })
      ).id,
    CONCEITO: async (userId, input) =>
      (
        await this.prisma.conceito.create({
          data: { nome: input.nome ?? '', descricao: input.descricao ?? null, usuarioId: userId },
        })
      ).id,
    BARALHO: async (userId, input, now) =>
      (
        await this.prisma.baralho.create({
          data: {
            titulo: (input.titulo ?? input.nome ?? '').trim(),
            usuarioId: userId,
            dataCriacao: now,
          },
        })
      ).id,
  };

  private async createNota(userId: string, input: CreateNodeInput, now: Date): Promise<string> {
    const titulo = (input.titulo ?? '').trim();
    const nota = await this.prisma.nota.create({
      data: {
        titulo,
        tipoNota: input.tipoNota ?? 'PERMANENTE',
        subtipo: input.subtipo as SubtipoNota,
        fonte: input.fonte?.trim() || null,
        slug: notaSlug(titulo, now),
        conteudo: input.conteudo ?? '',
        usuarioId: userId,
        dataCriacao: now,
      },
    });
    return nota.id;
  }
}

// Time-stamped, accent-stripped slug for a note (mirrors the vault import).
function notaSlug(titulo: string, when: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  const stamp = `${when.getFullYear()}${p(when.getMonth() + 1)}${p(when.getDate())}${p(when.getHours())}${p(when.getMinutes())}${p(when.getSeconds())}`;
  const slug = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug ? `${stamp}-${slug}` : stamp;
}
