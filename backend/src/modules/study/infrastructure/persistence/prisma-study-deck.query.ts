import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { StudyCardView } from '../../domain/ports/study-card-query';
import type { DeckStudyView, StudyDeckQuery } from '../../domain/ports/study-deck-query';

interface DeckCardRow {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: { nome: string } | null;
  aprendizado: { proximaRevisao: Date; fase: string; learningStep: number }[];
}

interface DeckRow {
  titulo: string;
  flashcards: DeckCardRow[];
}

function isDue(card: DeckCardRow, now: Date): boolean {
  const aprendizado = card.aprendizado[0];
  return !aprendizado || aprendizado.proximaRevisao <= now;
}

function toCardView(card: DeckCardRow): StudyCardView {
  const aprendizado = card.aprendizado[0];
  return {
    id: card.id,
    pergunta: card.pergunta,
    resposta: card.resposta,
    conceito: card.conceito?.nome ?? null,
    fase: aprendizado?.fase ?? 'LEARN',
    learningStep: aprendizado?.learningStep ?? 0,
  };
}

function toDeckView(deck: DeckRow): DeckStudyView {
  const now = new Date();
  return {
    titulo: deck.titulo,
    cards: deck.flashcards.filter((c) => isDue(c, now)).map(toCardView),
    totalNoDeck: deck.flashcards.length,
  };
}

// Read-model adapter: a deck's due cards for study.
@Injectable()
export class PrismaStudyDeckQuery implements StudyDeckQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findDeckForStudy(userId: string, baralhoId: string): Promise<DeckStudyView | null> {
    const deck = await this.prisma.baralho.findFirst({
      where: { id: baralhoId, usuarioId: userId },
      include: {
        flashcards: {
          include: {
            conceito: { select: { nome: true } },
            aprendizado: { where: { usuarioId: userId } },
          },
          orderBy: { dataCriacao: 'asc' },
        },
      },
    });
    return deck ? toDeckView(deck) : null;
  }
}
