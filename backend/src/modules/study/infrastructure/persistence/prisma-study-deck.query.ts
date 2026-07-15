import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NEW_CARD_SCHEDULE, type StudyCardView } from '../../domain/ports/study-card-query';
import type { DeckStudyView, StudyDeckQuery } from '../../domain/ports/study-deck-query';
import { PrismaCardImportanceQuery } from '../../../curriculum/infrastructure/persistence/prisma-card-importance.query';

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

type Aprendizado = DeckCardRow['aprendizado'][number];

function toSchedule(
  ap: Aprendizado,
): Omit<StudyCardView, 'id' | 'pergunta' | 'resposta' | 'conceito' | 'importancia'> {
  return {
    fase: ap.fase,
    learningStep: ap.learningStep,
    intervalo: ap.intervalo,
    fatorEase: ap.fatorEase,
    dificuldade: ap.dificuldade,
    proximaRevisao: ap.proximaRevisao.toISOString(),
    ultimaRevisao: ap.ultimaRevisao.toISOString(),
  };
}

function toCardView(card: DeckCardRow, importancia: number | null): StudyCardView {
  const identidade = {
    id: card.id,
    pergunta: card.pergunta,
    resposta: card.resposta,
    conceito: card.conceito?.nome ?? null,
    importancia,
  };
  const ap = card.aprendizado[0];
  return ap ? { ...identidade, ...toSchedule(ap) } : { ...identidade, ...NEW_CARD_SCHEDULE };
}

function toDeckView(deck: DeckRow, pesos: Map<string, number>): DeckStudyView {
  const now = new Date();
  const vencidos = deck.flashcards.filter((c) => isDue(c, now));
  return {
    titulo: deck.titulo,
    cards: vencidos.map((c) => toCardView(c, pesos.get(c.id) ?? null)),
    totalNoDeck: deck.flashcards.length,
  };
}

// Read-model adapter: a deck's due cards for study.
@Injectable()
export class PrismaStudyDeckQuery implements StudyDeckQuery {
  constructor(
    private readonly prisma: PrismaService,
    // Pesos do grafo: leitor compartilhado (curriculum), o mesmo do roadmap.
    private readonly importancia: PrismaCardImportanceQuery,
  ) {}

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
    if (!deck) return null;
    // Só os vencidos interessam: são os únicos que a sessão vai ordenar.
    const now = new Date();
    const vencidos = deck.flashcards.filter((c) => isDue(c, now)).map((c) => c.id);
    const pesos = await this.importancia.forFlashcards(userId, vencidos);
    return toDeckView(deck, pesos);
  }
}
