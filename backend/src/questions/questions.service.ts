import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type TipoQuestao = 'VERDADEIRO_FALSO' | 'MULTIPLA_ESCOLHA';

export interface AlternativaMultipla {
  letra: string;
  texto: string;
}

export interface CreateQuestaoDto {
  tipo: TipoQuestao;
  enunciado: string;
  alternativas?: AlternativaMultipla[];
  gabarito: string;
  explicacao?: string;
  conceitoId?: string | null;
}

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateQuestaoDto) {
    const questao = await this.prisma.questao.create({
      data: {
        usuarioId: userId,
        tipo: dto.tipo as any,
        enunciado: dto.enunciado,
        alternativas: dto.alternativas ? (dto.alternativas as any) : undefined,
        gabarito: dto.gabarito,
        explicacao: dto.explicacao ?? null,
        conceitoId: dto.conceitoId ?? null,
      },
    });
    return { questaoId: questao.id };
  }

  async findAll(userId: string) {
    const questoes = await this.prisma.questao.findMany({
      where: { usuarioId: userId },
      orderBy: { dataCriacao: 'desc' },
      include: { conceito: { select: { id: true, nome: true } } },
    });
    return questoes.map((q) => ({
      id: q.id,
      tipo: q.tipo,
      enunciado: q.enunciado,
      gabarito: q.gabarito,
      explicacao: q.explicacao ?? null,
      alternativas: q.alternativas ?? null,
      conceitoId: q.conceitoId ?? null,
      conceitoNome: q.conceito?.nome ?? null,
      dataCriacao: q.dataCriacao,
    }));
  }

  async findOne(userId: string, id: string) {
    const q = await this.prisma.questao.findUnique({
      where: { id },
      include: { conceito: { select: { id: true, nome: true } } },
    });
    if (!q) throw new NotFoundException('Questão não encontrada');
    if (q.usuarioId !== userId) throw new ForbiddenException();
    return {
      id: q.id,
      tipo: q.tipo,
      enunciado: q.enunciado,
      gabarito: q.gabarito,
      explicacao: q.explicacao ?? null,
      alternativas: q.alternativas ?? null,
      conceitoId: q.conceitoId ?? null,
      conceitoNome: q.conceito?.nome ?? null,
      dataCriacao: q.dataCriacao,
    };
  }

  async update(userId: string, id: string, dto: Partial<CreateQuestaoDto>) {
    const q = await this.prisma.questao.findUnique({ where: { id } });
    if (!q) throw new NotFoundException();
    if (q.usuarioId !== userId) throw new ForbiddenException();
    await this.prisma.questao.update({
      where: { id },
      data: {
        ...(dto.enunciado !== undefined && { enunciado: dto.enunciado }),
        ...(dto.alternativas !== undefined && { alternativas: dto.alternativas ? (dto.alternativas as any) : undefined }),
        ...(dto.gabarito !== undefined && { gabarito: dto.gabarito }),
        ...(dto.explicacao !== undefined && { explicacao: dto.explicacao ?? null }),
        ...(dto.conceitoId !== undefined && { conceitoId: dto.conceitoId ?? null }),
      },
    });
    return { success: true };
  }

  async remove(userId: string, id: string) {
    const q = await this.prisma.questao.findUnique({ where: { id } });
    if (!q) throw new NotFoundException();
    if (q.usuarioId !== userId) throw new ForbiddenException();
    await this.prisma.questao.delete({ where: { id } });
    return { success: true };
  }
}
