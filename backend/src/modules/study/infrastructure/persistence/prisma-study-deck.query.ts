import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NEW_CARD_SCHEDULE, type StudyCardView } from '../../domain/ports/study-card-query';
import type { DeckStudyView, StudyDeckQuery } from '../../domain/ports/study-deck-query';

interface DeckCardRow {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: { nome: string } | null;
  aprendizado: {
    proximaRevisao: Date;
    ultimaRevisao: Date;
    fase: string;
    learningStep: number;
    intervalo: number;
    fatorEase: number;
    dificuldade: number;
  }[];
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
  const identidade = {
    id: card.id,
    pergunta: card.pergunta,
    resposta: card.resposta,
    conceito: card.conceito?.nome ?? null,
  };
  const aprendizado = card.aprendizado[0];
  if (!aprendizado) return { ...identidade, ...NEW_CARD_SCHEDULE };
  return {
    ...identidade,
    fase: aprendizado.fase,
    learningStep: aprendizado.learningStep,
    intervalo: aprendizado.intervalo,
    fatorEase: aprendizado.fatorEase,
    dificuldade: aprendizado.dificuldade,
    proximaRevisao: aprendizado.proximaRevisao.toISOString(),
    ultimaRevisao: aprendizado.ultimaRevisao.toISOString(),
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
