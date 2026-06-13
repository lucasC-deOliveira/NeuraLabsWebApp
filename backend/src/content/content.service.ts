import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createReviewSchedule } from '../study/spaced-repetition';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Flashcards (CRUD) ----
  async createFlashcard(userId: string, data: { pergunta: string; resposta: string; conceitoId?: string | null }) {
    const fc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.flashcard.create({
        data: { pergunta: data.pergunta, resposta: data.resposta, conceitoId: data.conceitoId ?? null, usuarioId: userId },
      });
      const schedule = createReviewSchedule(3);
      const next = new Date();
      next.setDate(next.getDate() + schedule.interval);
      await tx.aprendizadoFlashcard.create({
        data: {
          flashcardId: created.id,
          usuarioId: userId,
          dificuldade: schedule.ease > 0 ? Math.max(1, Math.round((5 - schedule.ease) * 2)) : 5,
          intervalo: schedule.interval,
          proximaRevisao: next,
          ultimaRevisao: new Date(),
          estagioAprendizado: schedule.stage,
        },
      });
      return created;
    });
    return { flashcardId: fc.id };
  }

  async updateFlashcard(userId: string, id: string, data: { pergunta?: string; resposta?: string }) {
    await this.prisma.flashcard.updateMany({
      where: { id, usuarioId: userId },
      data: {
        ...(data.pergunta !== undefined && { pergunta: data.pergunta }),
        ...(data.resposta !== undefined && { resposta: data.resposta }),
      },
    });
    return { success: true };
  }

  async deleteFlashcard(userId: string, id: string) {
    await this.prisma.flashcard.deleteMany({ where: { id, usuarioId: userId } });
    return { success: true };
  }

  async deleteAllFlashcards(userId: string) {
    const flashcards = await this.prisma.flashcard.findMany({ where: { usuarioId: userId }, select: { id: true } });
    const count = flashcards.length;
    await this.prisma.$transaction(async (tx) => {
      for (const fc of flashcards) {
        const node = await tx.nodeConhecimento.findFirst({ where: { tipoNode: 'FLASHCARD', referenciaId: fc.id } });
        if (node) {
          await tx.conhecimentoAresta.deleteMany({ where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] } });
          await tx.nodeConhecimento.delete({ where: { id: node.id } });
        }
      }
      await tx.flashcard.deleteMany({ where: { usuarioId: userId } });
    });
    return { count };
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
    return assuntos.map((a) => ({ id: a.id, nome: a.nome, topicos: a.topicos.map((t) => ({ id: t.id, nome: t.nome, assuntoId: t.assuntoId ?? a.id })) }));
  }

  // Assuntos com seus tópicos (a home usa topicos.length)
  async listSubjects(userId: string) {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    });
    return assuntos.map((a) => ({ id: a.id, nome: a.nome, descricao: a.descricao, topicos: a.topicos }));
  }

  // Flashcards do usuário com hierarquia e o agendamento (SRS)
  async getFlashcards(userId: string, opts?: { conceptId?: string; topicId?: string }) {
    const where: Record<string, unknown> = { usuarioId: userId };
    if (opts?.conceptId) where.conceitoId = opts.conceptId;
    if (opts?.topicId) where.conceito = { topicoId: opts.topicId };

    const records = await this.prisma.flashcard.findMany({
      where,
      include: {
        conceito: { include: { topico: { include: { assunto: true } } } },
        aprendizado: { take: 1, orderBy: { ultimaRevisao: 'desc' } },
      },
      orderBy: { dataCriacao: 'desc' },
    });

    return records.map((fc) => ({
      id: fc.id,
      pergunta: fc.pergunta,
      resposta: fc.resposta,
      conceito: fc.conceito?.nome ?? '',
      topico: fc.conceito?.topico?.nome ?? '',
      topicoId: fc.conceito?.topico?.id ?? '',
      assunto: fc.conceito?.topico?.assunto?.nome ?? '',
      assuntoId: fc.conceito?.topico?.assunto?.id ?? '',
      dataCriacao: fc.dataCriacao,
      spacedRepetition: fc.aprendizado[0]
        ? {
            dificuldade: fc.aprendizado[0].dificuldade,
            intervalo: fc.aprendizado[0].intervalo,
            proximaRevisao: fc.aprendizado[0].proximaRevisao,
            ultimaRevisao: fc.aprendizado[0].ultimaRevisao,
            estagioAprendizado: fc.aprendizado[0].estagioAprendizado,
          }
        : null,
    }));
  }

  // Histórico das sessões de estudo (resumo)
  async getStudyHistory(userId: string) {
    const sessions = await this.prisma.sessaoEstudo.findMany({
      where: { usuarioId: userId },
      include: { _count: { select: { revisoes: true } }, revisoes: { select: { acertou: true, nivelConfianca: true } } },
      orderBy: { dataInicio: 'desc' },
      take: 20,
    });
    return sessions.map((s) => {
      const reviews = s.revisoes;
      const correctCount = reviews.filter((r) => r.acertou).length;
      const avgConfidence = reviews.length ? reviews.reduce((sum, r) => sum + r.nivelConfianca, 0) / reviews.length : 0;
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
