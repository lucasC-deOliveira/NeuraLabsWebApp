import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  NEW_CARD_SCHEDULE,
  NO_IMPORTANCE,
  type StudyCardQuery,
  type StudyCardView,
} from '../../domain/ports/study-card-query';

type DueRow = {
  fase: string;
  learningStep: number;
  intervalo: number;
  fatorEase: number;
  dificuldade: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
  flashcard: { id: string; pergunta: string; resposta: string; conceito: { nome: string } | null };
};

// A sessão geral (todos os vencidos do usuário) ainda não ordena por peso — só o
// estudo de um baralho ordena. Por isso a importância aqui é nula: "não calculada".
function toDueView(r: DueRow): StudyCardView {
  return {
    id: r.flashcard.id,
    pergunta: r.flashcard.pergunta,
    resposta: r.flashcard.resposta,
    conceito: r.flashcard.conceito?.nome ?? null,
    ...NO_IMPORTANCE,
    fase: r.fase,
    learningStep: r.learningStep,
    intervalo: r.intervalo,
    fatorEase: r.fatorEase,
    dificuldade: r.dificuldade,
    proximaRevisao: r.proximaRevisao.toISOString(),
    ultimaRevisao: r.ultimaRevisao.toISOString(),
  };
}

type NewRow = { id: string; pergunta: string; resposta: string; conceito: { nome: string } | null };

// Card novo: sem registro de aprendizado — o estado inicial do SM-2, e
// proximaRevisao nula para quem lê saber que ele nunca foi revisado.
function toNewView(fc: NewRow): StudyCardView {
  return {
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    conceito: fc.conceito?.nome ?? null,
    ...NEW_CARD_SCHEDULE,
    ...NO_IMPORTANCE,
  };
}

// Read-model adapter: queries the cards eligible for a new study session.
@Injectable()
export class PrismaStudyCardQuery implements StudyCardQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findDueCards(userId: string): Promise<StudyCardView[]> {
    const records = await this.prisma.aprendizadoFlashcard.findMany({
      where: { usuarioId: userId, proximaRevisao: { lte: new Date() } },
      include: { flashcard: { include: { conceito: { select: { nome: true } } } } },
      orderBy: [{ fase: 'asc' }, { proximaRevisao: 'asc' }],
    });
    return records.map(toDueView);
  }

  async findNewCards(userId: string, limit: number): Promise<StudyCardView[]> {
    const records = await this.prisma.flashcard.findMany({
      where: { usuarioId: userId, aprendizado: { none: {} } },
      include: { conceito: { select: { nome: true } } },
      take: limit,
    });
    return records.map(toNewView);
  }
}
