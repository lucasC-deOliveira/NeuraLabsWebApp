import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { applyInterleaving } from './interleaving';
import { calculateNextInterval, createReviewSchedule, mapQualityToScore } from './spaced-repetition';

const MAX_NEW = 10;
const MAX_CARDS = 30;

export interface StudyCard {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
  spacedRepetition?: { dificuldade: number; intervalo: number; proximaRevisao: Date; ultimaRevisao: Date; estagioAprendizado: number } | null;
}

@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  private async dueCards(userId: string): Promise<StudyCard[]> {
    const now = new Date();
    const records = await this.prisma.aprendizadoFlashcard.findMany({
      where: { usuarioId: userId, proximaRevisao: { lte: now } },
      include: { flashcard: { include: { conceito: true } } },
      orderBy: [{ estagioAprendizado: 'asc' }, { proximaRevisao: 'asc' }],
    });
    return records.map((r) => ({
      id: r.flashcard.id,
      pergunta: r.flashcard.pergunta,
      resposta: r.flashcard.resposta,
      conceito: r.flashcard.conceito?.nome ?? null,
      spacedRepetition: { dificuldade: r.dificuldade, intervalo: r.intervalo, proximaRevisao: r.proximaRevisao, ultimaRevisao: r.ultimaRevisao, estagioAprendizado: r.estagioAprendizado },
    }));
  }

  private async newCards(userId: string, limit = MAX_NEW): Promise<StudyCard[]> {
    const records = await this.prisma.flashcard.findMany({
      where: { usuarioId: userId, aprendizado: { none: {} } },
      include: { conceito: { select: { nome: true } } },
      take: limit,
    });
    return records.map((fc) => ({ id: fc.id, pergunta: fc.pergunta, resposta: fc.resposta, conceito: fc.conceito?.nome ?? null }));
  }

  async startSession(userId: string): Promise<{ sessionId: string; cards: StudyCard[] }> {
    const session = await this.prisma.sessaoEstudo.create({ data: { usuarioId: userId }, select: { id: true } });
    const [due, fresh] = await Promise.all([this.dueCards(userId), this.newCards(userId)]);
    const cards = applyInterleaving([...due, ...fresh].slice(0, MAX_CARDS));
    return { sessionId: session.id, cards };
  }

  async endSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    await this.prisma.sessaoEstudo.updateMany({ where: { id: sessionId, usuarioId: userId }, data: { dataFim: new Date() } });
    return { success: true };
  }

  async submitReview(
    userId: string,
    data: { flashcardId: string; respostaUsuario: string; acertou: boolean; nivelConfianca: number; tipoErro?: string; tempoResposta?: number; sessaoId?: string },
  ): Promise<{ success: boolean }> {
    const session = await this.prisma.sessaoEstudo.findFirst({
      where: data.sessaoId ? { id: data.sessaoId, usuarioId: userId } : { usuarioId: userId, dataFim: null },
      orderBy: { dataInicio: 'desc' },
      select: { id: true },
    });
    if (!session) throw new BadRequestException('Nenhuma sessão de estudo ativa.');

    const quality = mapQualityToScore(data.acertou, data.nivelConfianca);
    await this.prisma.$transaction(async (tx) => {
      const fc = await tx.flashcard.findFirst({ where: { id: data.flashcardId, usuarioId: userId }, select: { usuarioId: true } });
      if (!fc) throw new BadRequestException('Flashcard não encontrado');

      await tx.revisaoFlashcard.create({
        data: { flashcardId: data.flashcardId, sessaoId: session.id, respostaUsuario: data.respostaUsuario, acertou: data.acertou, nivelConfianca: data.nivelConfianca, tipoErro: data.tipoErro, tempoResposta: data.tempoResposta },
      });

      const now = new Date();
      const existing = await tx.aprendizadoFlashcard.findFirst({ where: { flashcardId: data.flashcardId, usuarioId: userId } });
      if (!existing) {
        const schedule = createReviewSchedule(quality);
        const next = new Date(now);
        next.setDate(next.getDate() + schedule.interval);
        await tx.aprendizadoFlashcard.create({
          data: { flashcardId: data.flashcardId, usuarioId: userId, dificuldade: Math.max(1, 10 - quality), intervalo: schedule.interval, proximaRevisao: next, ultimaRevisao: now, estagioAprendizado: schedule.stage },
        });
      } else {
        const result = calculateNextInterval((11 - existing.dificuldade) / 3, existing.intervalo, quality);
        const next = new Date(now);
        next.setDate(next.getDate() + result.newInterval);
        await tx.aprendizadoFlashcard.update({
          where: { flashcardId_usuarioId: { flashcardId: data.flashcardId, usuarioId: userId } },
          data: { dificuldade: Math.max(1, Math.min(10, 10 - quality * 2)), intervalo: result.newInterval, proximaRevisao: next, ultimaRevisao: now, estagioAprendizado: result.newStage },
        });
      }
    });
    return { success: true };
  }
}
