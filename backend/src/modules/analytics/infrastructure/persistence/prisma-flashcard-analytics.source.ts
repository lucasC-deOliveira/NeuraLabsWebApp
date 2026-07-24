import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  FlashcardAnalyticsSource,
  LearningStateRow,
  ProblemCardRow,
  ReviewRow,
} from '../../domain/ports/flashcard-analytics-source';
import { REVIEW_SELECT, toReviewRow } from './review-row.mapper';

// Linha do groupBy de revisões por carta.
interface CardCount {
  flashcardId: string;
  _count: { _all: number };
}

// Cláusula opcional que restringe as cartas: por baralho (relação BaralhoFlashcards)
// e/ou por assunto (conceito -> tópico -> assunto). Ambos combinam no mesmo filtro.
interface FlashcardWhere {
  baralhos?: { some: { id: string } };
  conceito?: { topico: { assuntoId: string } };
}
function cardFilter(baralhoId?: string, assuntoId?: string): { flashcard?: FlashcardWhere } {
  const flashcard: FlashcardWhere = {};
  if (baralhoId) flashcard.baralhos = { some: { id: baralhoId } };
  if (assuntoId) flashcard.conceito = { topico: { assuntoId } };
  return Object.keys(flashcard).length > 0 ? { flashcard } : {};
}

// Cruza total x erros por carta e mantém só as que erraram ao menos uma vez.
function mergeCardStats(
  totals: CardCount[],
  wrongs: CardCount[],
): { id: string; total: number; wrong: number }[] {
  const wrong = new Map(wrongs.map((w) => [w.flashcardId, w._count._all]));
  return totals
    .map((t) => ({ id: t.flashcardId, total: t._count._all, wrong: wrong.get(t.flashcardId) ?? 0 }))
    .filter((c) => c.wrong > 0);
}

// Read-model adapter: lê o estado SM-2 e as revisões do usuário para os analytics.
@Injectable()
export class PrismaFlashcardAnalyticsSource implements FlashcardAnalyticsSource {
  constructor(private readonly prisma: PrismaService) {}

  learningStates(
    userId: string,
    baralhoId?: string,
    assuntoId?: string,
  ): Promise<LearningStateRow[]> {
    return this.prisma.aprendizadoFlashcard.findMany({
      where: { usuarioId: userId, ...cardFilter(baralhoId, assuntoId) },
      select: { fase: true, intervalo: true, proximaRevisao: true },
    });
  }

  async reviewsSince(
    userId: string,
    since: Date,
    baralhoId?: string,
    assuntoId?: string,
  ): Promise<ReviewRow[]> {
    const rows = await this.prisma.revisaoFlashcard.findMany({
      where: {
        sessao: { usuarioId: userId, dataInicio: { gte: since } },
        ...cardFilter(baralhoId, assuntoId),
      },
      select: REVIEW_SELECT,
    });
    return rows.map(toReviewRow);
  }

  async problemCardStats(
    userId: string,
    since: Date,
    baralhoId?: string,
    assuntoId?: string,
  ): Promise<ProblemCardRow[]> {
    const where = {
      sessao: { usuarioId: userId, dataInicio: { gte: since } },
      ...cardFilter(baralhoId, assuntoId),
    };
    const [totals, wrongs] = await Promise.all([
      this.prisma.revisaoFlashcard.groupBy({ by: ['flashcardId'], where, _count: { _all: true } }),
      this.prisma.revisaoFlashcard.groupBy({
        by: ['flashcardId'],
        where: { ...where, acertou: false },
        _count: { _all: true },
      }),
    ]);
    return this.withPerguntas(mergeCardStats(totals, wrongs));
  }

  private async withPerguntas(
    cards: { id: string; total: number; wrong: number }[],
  ): Promise<ProblemCardRow[]> {
    const rows = await this.prisma.flashcard.findMany({
      where: { id: { in: cards.map((c) => c.id) } },
      select: { id: true, pergunta: true },
    });
    const perguntas = new Map(rows.map((r) => [r.id, r.pergunta]));
    return cards.map((c) => ({
      pergunta: perguntas.get(c.id) ?? '',
      total: c.total,
      wrong: c.wrong,
    }));
  }
}
