import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

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
