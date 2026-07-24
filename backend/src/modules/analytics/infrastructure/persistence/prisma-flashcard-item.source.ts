import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  FlashcardItemMeta,
  FlashcardItemSource,
} from '../../domain/ports/flashcard-item-source';
import type { ReviewRow } from '../../domain/ports/flashcard-analytics-source';
import { REVIEW_SELECT, toReviewRow } from './review-row.mapper';

// Read-model adapter dos analytics de UMA carta (histórico + estado SM-2).
@Injectable()
export class PrismaFlashcardItemSource implements FlashcardItemSource {
  constructor(private readonly prisma: PrismaService) {}

  async cardReviews(userId: string, cardId: string): Promise<ReviewRow[]> {
    const rows = await this.prisma.revisaoFlashcard.findMany({
      where: { flashcardId: cardId, sessao: { usuarioId: userId } },
      select: REVIEW_SELECT,
    });
    return rows.map(toReviewRow);
  }

  async cardMeta(userId: string, cardId: string): Promise<FlashcardItemMeta | null> {
    const card = await this.prisma.flashcard.findFirst({
      where: { id: cardId, usuarioId: userId },
      select: { pergunta: true },
    });
    if (!card) return null;
    const state = await this.prisma.aprendizadoFlashcard.findUnique({
      where: { flashcardId_usuarioId: { flashcardId: cardId, usuarioId: userId } },
      select: { fase: true, intervalo: true, proximaRevisao: true },
    });
    return { pergunta: card.pergunta, state: state ?? null };
  }
}
