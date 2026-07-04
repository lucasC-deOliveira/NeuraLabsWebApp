import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ProvaRepository } from '../../domain/ports/prova-repository';
import type {
  CreateProvaFromParsedInput,
  CreateProvaInput,
  OwnedProvaDetail,
  ParsedAlternativa,
  ParsedImagem,
  ParsedQuestao,
  ProvaDetailQuestao,
  ProvaSummary,
  StoredQuestaoImagem,
  UpdateProvaPatch,
} from '../../domain/prova';

const QUESTAO_SELECT = {
  id: true,
  tipo: true,
  enunciado: true,
  alternativas: true,
  gabarito: true,
  explicacao: true,
  conceito: { select: { id: true, nome: true } },
  imagens: { select: { id: true, ordem: true, mimetype: true }, orderBy: { ordem: 'asc' } },
} as const;

const asAlternativas = (v: Prisma.JsonValue | null): ParsedAlternativa[] | null =>
  (v ?? null) as ParsedAlternativa[] | null;

@Injectable()
export class PrismaProvaRepository implements ProvaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateProvaInput): Promise<string> {
    const prova = await this.prisma.prova.create({
      data: provaData(userId, input.titulo, input.descricao, input.questaoIds),
      select: { id: true },
    });
    return prova.id;
  }

  async createFromParsed(userId: string, input: CreateProvaFromParsedInput): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const questaoIds = await persistQuestoes(tx, userId, input.questoes);
      const prova = await tx.prova.create({
        data: provaData(userId, input.titulo, input.descricao, questaoIds),
        select: { id: true },
      });
      return prova.id;
    });
  }

  async listByUser(userId: string): Promise<ProvaSummary[]> {
    const provas = await this.prisma.prova.findMany({
      where: { usuarioId: userId },
      orderBy: { dataCriacao: 'desc' },
      include: { _count: { select: { questoes: true } } },
    });
    return provas.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      descricao: p.descricao ?? null,
      totalQuestoes: p._count.questoes,
      dataCriacao: p.dataCriacao,
    }));
  }

  async findDetail(id: string): Promise<OwnedProvaDetail | null> {
    const prova = await this.prisma.prova.findUnique({
      where: { id },
      include: PROVA_DETAIL_INCLUDE,
    });
    return prova ? toOwnedDetail(prova) : null;
  }

  async findOwner(id: string): Promise<{ usuarioId: string } | null> {
    return this.prisma.prova.findUnique({ where: { id }, select: { usuarioId: true } });
  }

  async findImagem(id: string): Promise<StoredQuestaoImagem | null> {
    const imagem = await this.prisma.questaoImagem.findUnique({
      where: { id },
      select: { mimetype: true, dados: true, questao: { select: { usuarioId: true } } },
    });
    if (!imagem) return null;
    return {
      usuarioId: imagem.questao.usuarioId,
      mimetype: imagem.mimetype,
      dados: Buffer.from(imagem.dados),
    };
  }

  async update(id: string, patch: UpdateProvaPatch): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.prova.update({ where: { id }, data: provaUpdateData(patch) });
      if (patch.questaoIds === undefined) return;
      await tx.provaQuestao.deleteMany({ where: { provaId: id } });
      await tx.provaQuestao.createMany({
        data: patch.questaoIds.map((questaoId, ordem) => ({ provaId: id, questaoId, ordem })),
      });
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.prova.delete({ where: { id } });
  }
}

const PROVA_DETAIL_INCLUDE = {
  questoes: {
    orderBy: { ordem: 'asc' },
    include: { questao: { select: QUESTAO_SELECT } },
  },
} as const;

type ProvaDetailRow = Prisma.ProvaGetPayload<{ include: typeof PROVA_DETAIL_INCLUDE }>;

function toOwnedDetail(prova: ProvaDetailRow): OwnedProvaDetail {
  return {
    usuarioId: prova.usuarioId,
    detail: {
      id: prova.id,
      titulo: prova.titulo,
      descricao: prova.descricao ?? null,
      dataCriacao: prova.dataCriacao,
      questoes: prova.questoes.map(toDetailQuestao),
    },
  };
}

type QuestaoRow = Prisma.ProvaQuestaoGetPayload<{
  include: { questao: { select: typeof QUESTAO_SELECT } };
}>;

function toDetailQuestao(pq: QuestaoRow): ProvaDetailQuestao {
  return {
    ordem: pq.ordem,
    id: pq.questao.id,
    tipo: pq.questao.tipo,
    enunciado: pq.questao.enunciado,
    alternativas: asAlternativas(pq.questao.alternativas),
    gabarito: pq.questao.gabarito,
    explicacao: pq.questao.explicacao ?? null,
    conceitoNome: pq.questao.conceito?.nome ?? null,
    imagens: pq.questao.imagens.map((img) => ({ id: img.id, ordem: img.ordem, mimetype: img.mimetype })),
  };
}

function provaData(
  userId: string,
  titulo: string,
  descricao: string | undefined,
  questaoIds: string[],
): Prisma.ProvaUncheckedCreateInput {
  return {
    usuarioId: userId,
    titulo,
    descricao: descricao ?? null,
    questoes: { create: questaoIds.map((questaoId, ordem) => ({ questaoId, ordem })) },
  };
}

function provaUpdateData(patch: UpdateProvaPatch): Prisma.ProvaUncheckedUpdateInput {
  const data: Prisma.ProvaUncheckedUpdateInput = {};
  if (patch.titulo !== undefined) data.titulo = patch.titulo;
  if (patch.descricao !== undefined) data.descricao = patch.descricao ?? null;
  return data;
}

// Persists the parsed questions, returning their ids in input order.
async function persistQuestoes(
  tx: Prisma.TransactionClient,
  userId: string,
  questoes: ParsedQuestao[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const q of questoes) {
    const created = await tx.questao.create({ data: questaoData(userId, q), select: { id: true } });
    ids.push(created.id);
  }
  return ids;
}

function imagensCreate(imagens: ParsedImagem[] | undefined): Prisma.QuestaoImagemCreateNestedManyWithoutQuestaoInput | undefined {
  if (!imagens || imagens.length === 0) return undefined;
  return {
    create: imagens.map((img, ordem) => ({
      ordem,
      mimetype: img.mimetype,
      dados: Buffer.from(img.base64, 'base64'),
    })),
  };
}

function questaoData(userId: string, q: ParsedQuestao): Prisma.QuestaoUncheckedCreateInput {
  return {
    usuarioId: userId,
    tipo: q.tipo,
    enunciado: q.enunciado,
    alternativas: q.alternativas ? (q.alternativas as unknown as Prisma.InputJsonValue) : undefined,
    gabarito: q.gabarito,
    explicacao: q.explicacao ?? null,
    imagens: imagensCreate(q.imagens),
  };
}
