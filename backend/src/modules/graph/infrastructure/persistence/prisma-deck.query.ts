import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  DeckCards,
  DeckCardView,
  DeckQuery,
  FlashcardPickerItem,
} from '../../domain/ports/deck-query';

type DeckCardRow = {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: { nome: string } | null;
};

@Injectable()
export class PrismaDeckQuery implements DeckQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listUserFlashcards(userId: string): Promise<FlashcardPickerItem[]> {
    const fcs = await this.prisma.flashcard.findMany({
      where: { usuarioId: userId },
      include: { conceito: true },
      orderBy: { dataCriacao: 'desc' },
    });
    return fcs.map((f) => ({ id: f.id, pergunta: f.pergunta, conceito: f.conceito?.nome ?? null }));
  }

  async findDeckForStudy(userId: string, baralhoId: string): Promise<DeckCards | null> {
    const baralho = await this.prisma.baralho.findFirst({
      where: { id: baralhoId, usuarioId: userId },
      include: {
        flashcards: {
          include: { conceito: { select: { nome: true } } },
          orderBy: { dataCriacao: 'asc' },
        },
      },
    });
    if (!baralho) return null;
    return { titulo: baralho.titulo, cards: baralho.flashcards.map(toCardView) };
  }
}

const toCardView = (fc: DeckCardRow): DeckCardView => ({
  id: fc.id,
  pergunta: fc.pergunta,
  resposta: fc.resposta,
  conceito: fc.conceito?.nome ?? null,
});
