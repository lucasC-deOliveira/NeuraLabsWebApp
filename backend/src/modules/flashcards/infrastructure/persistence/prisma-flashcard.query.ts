import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { FlashcardQuery } from '../../domain/ports/flashcard-query';
import type {
  FlashcardView,
  ListFlashcardsOptions,
  SpacedRepetition,
} from '../../domain/flashcard-views';

const INCLUDE = {
  conceito: { include: { topico: { include: { assunto: true } } } },
  aprendizado: { take: 1, orderBy: { ultimaRevisao: 'desc' } },
} satisfies Prisma.FlashcardInclude;

type Row = Prisma.FlashcardGetPayload<{ include: typeof INCLUDE }>;

@Injectable()
export class PrismaFlashcardQuery implements FlashcardQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listFlashcards(userId: string, opts: ListFlashcardsOptions): Promise<FlashcardView[]> {
    const rows = await this.prisma.flashcard.findMany({
      where: buildWhere(userId, opts),
      include: INCLUDE,
      orderBy: { dataCriacao: 'desc' },
    });
    return rows.map(toView);
  }
}

function buildWhere(userId: string, opts: ListFlashcardsOptions): Prisma.FlashcardWhereInput {
  const where: Prisma.FlashcardWhereInput = { usuarioId: userId };
  if (opts.conceptId) where.conceitoId = opts.conceptId;
  if (opts.topicId) where.conceito = { topicoId: opts.topicId };
  return where;
}

interface Hierarchy {
  conceito: string;
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
}

const orEmpty = (v: string | undefined): string => v ?? '';

function hierarchyOf(fc: Row): Hierarchy {
  const topico = fc.conceito?.topico;
  const assunto = topico?.assunto;
  return {
    conceito: orEmpty(fc.conceito?.nome),
    topico: orEmpty(topico?.nome),
    topicoId: orEmpty(topico?.id),
    assunto: orEmpty(assunto?.nome),
    assuntoId: orEmpty(assunto?.id),
  };
}

function toView(fc: Row): FlashcardView {
  return {
    id: fc.id,
    tipo: fc.tipo ?? null,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    ...hierarchyOf(fc),
    dataCriacao: fc.dataCriacao,
    spacedRepetition: toSrs(fc.aprendizado[0]),
  };
}

function toSrs(a: Row['aprendizado'][number] | undefined): SpacedRepetition | null {
  if (!a) return null;
  return {
    dificuldade: a.dificuldade,
    intervalo: a.intervalo,
    proximaRevisao: a.proximaRevisao,
    ultimaRevisao: a.ultimaRevisao,
    estagioAprendizado: a.estagioAprendizado,
  };
}
