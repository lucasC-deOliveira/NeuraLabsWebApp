import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Hierarquia (criação) ----
  async createAssunto(userId: string, nome: string) {
    const created = await this.prisma.assunto.create({ data: { nome, usuarioId: userId } });
    return { id: created.id, nome: created.nome };
  }

  async createTopico(userId: string, nome: string, assuntoId: string) {
    const assunto = await this.prisma.assunto.findFirst({
      where: { id: assuntoId, usuarioId: userId },
    });
    if (!assunto) throw new Error('Assunto não encontrado');
    const created = await this.prisma.topico.create({
      data: { nome, assuntoId, usuarioId: userId },
    });
    return { id: created.id, nome: created.nome };
  }

  // conceito sob um tópico (cria assunto/tópico antes via createAssunto/createTopico quando necessário)
  async createFullConcept(
    userId: string,
    input: { nome: string; assuntoId: string; topicoId: string },
  ) {
    const topico = await this.prisma.topico.findFirst({
      where: { id: input.topicoId, assunto: { usuarioId: userId } },
    });
    if (!topico) throw new Error('Tópico não encontrado');
    const created = await this.prisma.conceito.create({
      data: { nome: input.nome, topicoId: input.topicoId, usuarioId: userId },
    });
    return { id: created.id, nome: created.nome };
  }

  // árvore: Assunto → (PERTENCE_A) → Tópico → (FUNDAMENTA) → Conceito
  async getHierarquiaConceitos(userId: string) {
    const userAssuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { include: { conceitos: true } } },
    });

    return userAssuntos.map((assunto) => ({
      id: assunto.id,
      nome: assunto.nome,
      relAssuntoTopico: [
        {
          tipoRelacao: 'PERTENCE_A',
          topicos: assunto.topicos.map((t) => ({
            id: t.id,
            nome: t.nome,
            assuntoId: assunto.id,
            relacoesTopicoConceito: t.conceitos.length
              ? [
                  {
                    tipoRelacao: 'FUNDAMENTA',
                    conceitos: t.conceitos.map((c) => ({
                      id: c.id,
                      nome: c.nome,
                      topicoId: t.id,
                      topicoNome: t.nome,
                      assuntoId: assunto.id,
                      assuntoNome: assunto.nome,
                    })),
                  },
                ]
              : [],
          })),
        },
      ],
    }));
  }

  // hierarquia completa: assunto → tópico → conceito (dropdown de conceito)
  async getConceptHierarchy(userId: string) {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { include: { conceitos: { select: { id: true, nome: true } } } } },
      orderBy: { nome: 'asc' },
    });
    return assuntos.map((a) => ({
      id: a.id,
      nome: a.nome,
      topicos: a.topicos.map((t) => ({ id: t.id, nome: t.nome, conceitos: t.conceitos })),
    }));
  }

  // hierarquia (filtros): assuntos → tópicos
  async getFlashcardFilterData(userId: string) {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { select: { id: true, nome: true, assuntoId: true } } },
    });
    return assuntos.map((a) => ({
      id: a.id,
      nome: a.nome,
      topicos: a.topicos.map((t) => ({ id: t.id, nome: t.nome, assuntoId: t.assuntoId ?? a.id })),
    }));
  }

  // Assuntos com seus tópicos (a home usa topicos.length)
  async listSubjects(userId: string) {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    });
    return assuntos.map((a) => ({
      id: a.id,
      nome: a.nome,
      descricao: a.descricao,
      topicos: a.topicos,
    }));
  }

  // Histórico das sessões de estudo (resumo)
  async getStudyHistory(userId: string) {
    const sessions = await this.prisma.sessaoEstudo.findMany({
      where: { usuarioId: userId },
      include: {
        _count: { select: { revisoes: true } },
        revisoes: { select: { acertou: true, nivelConfianca: true } },
      },
      orderBy: { dataInicio: 'desc' },
      take: 20,
    });
    return sessions.map((s) => {
      const reviews = s.revisoes;
      const correctCount = reviews.filter((r) => r.acertou).length;
      const avgConfidence = reviews.length
        ? reviews.reduce((sum, r) => sum + r.nivelConfianca, 0) / reviews.length
        : 0;
      return {
        id: s.id,
        dataInicio: s.dataInicio,
        dataFim: s.dataFim,
        totalReviews: s._count.revisoes,
        correctCount,
        incorrectCount: reviews.length - correctCount,
        avgConfidence,
      };
    });
  }
}
