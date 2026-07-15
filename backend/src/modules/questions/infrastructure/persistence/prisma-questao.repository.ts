import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { QuestaoRepository, UpdateQuestaoPatch } from '../../domain/ports/questao-repository';
import type {
  AlternativaMultipla,
  CreateQuestaoInput,
  OwnedQuestao,
  QuestaoView,
} from '../../domain/questao';
import type { ConceptTag } from '../../../curriculum/domain/curriculum-views';
import { PrismaConnectedConceptsQuery } from '../../../curriculum/infrastructure/persistence/prisma-connected-concepts.query';

const SELECT = {
  id: true,
  usuarioId: true,
  tipo: true,
  enunciado: true,
  gabarito: true,
  explicacao: true,
  alternativas: true,
  conceitoId: true,
  dataCriacao: true,
  conceito: { select: { id: true, nome: true } },
} as const;

type Row = Prisma.QuestaoGetPayload<{ select: typeof SELECT }>;

const asAlternativas = (v: Prisma.JsonValue | null): AlternativaMultipla[] | null =>
  (v ?? null) as AlternativaMultipla[] | null;

function toView(q: Row, conceitosConectados: ConceptTag[] = []): QuestaoView {
  return {
    id: q.id,
    tipo: q.tipo,
    enunciado: q.enunciado,
    gabarito: q.gabarito,
    explicacao: q.explicacao ?? null,
    alternativas: asAlternativas(q.alternativas),
    conceitoId: q.conceitoId ?? null,
    conceitoNome: q.conceito?.nome ?? null,
    conceitosConectados,
    dataCriacao: q.dataCriacao,
  };
}

@Injectable()
export class PrismaQuestaoRepository implements QuestaoRepository {
  constructor(
    private readonly prisma: PrismaService,
    // Conceitos do grafo: leitor compartilhado (curriculum), o mesmo dos flashcards.
    private readonly connected: PrismaConnectedConceptsQuery,
  ) {}

  async create(userId: string, input: CreateQuestaoInput): Promise<string> {
    const { id } = await this.prisma.questao.create({
      data: {
        usuarioId: userId,
        tipo: input.tipo,
        enunciado: input.enunciado,
        alternativas: input.alternativas
          ? (input.alternativas as unknown as Prisma.InputJsonValue)
          : undefined,
        gabarito: input.gabarito,
        explicacao: input.explicacao ?? null,
        conceitoId: input.conceitoId ?? null,
      },
      select: { id: true },
    });
    return id;
  }

  async listByUser(userId: string): Promise<QuestaoView[]> {
    const rows = await this.prisma.questao.findMany({
      where: { usuarioId: userId },
      orderBy: { dataCriacao: 'desc' },
      select: SELECT,
    });
    // As tags vêm do grafo (arestas QUESTION → CONCEITO), mesmo leitor dos flashcards.
    const connected = await this.connected.forQuestions(
      userId,
      rows.map((r) => r.id),
    );
    return rows.map((r) => toView(r, connected.get(r.id) ?? []));
  }

  async findById(id: string): Promise<OwnedQuestao | null> {
    const q = await this.prisma.questao.findUnique({ where: { id }, select: SELECT });
    return q ? { ...toView(q), usuarioId: q.usuarioId } : null;
  }

  async update(id: string, patch: UpdateQuestaoPatch): Promise<void> {
    await this.prisma.questao.update({ where: { id }, data: toUpdateData(patch) });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.questao.delete({ where: { id } });
  }
}

function toUpdateData(patch: UpdateQuestaoPatch): Prisma.QuestaoUncheckedUpdateInput {
  const data: Prisma.QuestaoUncheckedUpdateInput = {};
  if (patch.enunciado !== undefined) data.enunciado = patch.enunciado;
  if (patch.gabarito !== undefined) data.gabarito = patch.gabarito;
  if (patch.explicacao !== undefined) data.explicacao = patch.explicacao ?? null;
  if (patch.alternativas !== undefined)
    data.alternativas = patch.alternativas as unknown as Prisma.InputJsonValue;
  if (patch.conceitoId !== undefined) data.conceitoId = patch.conceitoId ?? null;
  return data;
}
