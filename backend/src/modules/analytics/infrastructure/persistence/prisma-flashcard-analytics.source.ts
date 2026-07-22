import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  FlashcardAnalyticsSource,
  LearningStateRow,
  ReviewRow,
} from '../../domain/ports/flashcard-analytics-source';

// Read-model adapter: lê o estado SM-2 e as revisões do usuário para os analytics.
@Injectable()
export class PrismaFlashcardAnalyticsSource implements FlashcardAnalyticsSource {
  constructor(private readonly prisma: PrismaService) {}

  learningStates(userId: string): Promise<LearningStateRow[]> {
    return this.prisma.aprendizadoFlashcard.findMany({
      where: { usuarioId: userId },
      select: { fase: true, intervalo: true, proximaRevisao: true },
    });
  }

  async reviewsSince(userId: string, since: Date): Promise<ReviewRow[]> {
    const rows = await this.prisma.revisaoFlashcard.findMany({
      where: { sessao: { usuarioId: userId, dataInicio: { gte: since } } },
      select: {
        acertou: true,
        nivelConfianca: true,
        tempoResposta: true,
        sessao: { select: { dataInicio: true } },
      },
    });
    return rows.map((row) => ({
      data: row.sessao.dataInicio,
      acertou: row.acertou,
      nivelConfianca: row.nivelConfianca,
      tempoResposta: row.tempoResposta,
    }));
  }
}
