import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  CardReviewStat,
  DeckAnalyticsSource,
  DeckCardRow,
} from '../../domain/ports/deck-analytics-source';

interface BaralhoRow {
  id: string;
  titulo: string;
  flashcards: {
    id: string;
    aprendizado: { fase: string; intervalo: number; proximaRevisao: Date }[];
  }[];
}

// Achata (baralho, carta) em linhas com o estado SM-2 (ou null se nunca estudada).
function flatten(baralhos: BaralhoRow[]): DeckCardRow[] {
  return baralhos.flatMap((b) =>
    b.flashcards.map((f) => {
      const ap = f.aprendizado[0] ?? null;
      return {
        baralhoId: b.id,
        titulo: b.titulo,
        flashcardId: f.id,
        fase: ap?.fase ?? null,
        intervalo: ap?.intervalo ?? null,
        proximaRevisao: ap?.proximaRevisao ?? null,
      };
    }),
  );
}

// Read-model adapter: lê baralhos com suas cartas e o desempenho por carta.
@Injectable()
export class PrismaDeckAnalyticsSource implements DeckAnalyticsSource {
  constructor(private readonly prisma: PrismaService) {}

  async deckCards(userId: string): Promise<DeckCardRow[]> {
    const baralhos = await this.prisma.baralho.findMany({
      where: { usuarioId: userId },
      select: {
        id: true,
        titulo: true,
        flashcards: {
          select: {
            id: true,
            aprendizado: {
              where: { usuarioId: userId },
              select: { fase: true, intervalo: true, proximaRevisao: true },
            },
          },
        },
      },
    });
    return flatten(baralhos);
  }

  async cardReviewStats(userId: string, since: Date): Promise<CardReviewStat[]> {
    const where = { sessao: { usuarioId: userId, dataInicio: { gte: since } } };
    const [totals, corrects] = await Promise.all([
      this.prisma.revisaoFlashcard.groupBy({ by: ['flashcardId'], where, _count: { _all: true } }),
      this.prisma.revisaoFlashcard.groupBy({
        by: ['flashcardId'],
        where: { ...where, acertou: true },
        _count: { _all: true },
      }),
    ]);
    const correct = new Map(corrects.map((c) => [c.flashcardId, c._count._all]));
    return totals.map((t) => ({
      flashcardId: t.flashcardId,
      total: t._count._all,
      correct: correct.get(t.flashcardId) ?? 0,
    }));
  }
}
