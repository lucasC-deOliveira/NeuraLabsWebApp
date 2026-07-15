import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  FlashcardStudyView,
  StudyFlashcardQuery,
} from '../../domain/ports/study-flashcard-query';
import { NEW_CARD_SCHEDULE } from '../../domain/ports/study-card-query';

interface FlashcardWithLearning {
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

type Aprendizado = FlashcardWithLearning['aprendizado'][number];

function toSchedule(
  ap: Aprendizado,
): Omit<FlashcardStudyView, 'id' | 'pergunta' | 'resposta' | 'conceito' | 'due'> {
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

function toStudyView(fc: FlashcardWithLearning): FlashcardStudyView {
  const identidade = {
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    conceito: fc.conceito?.nome ?? null,
  };
  const ap = fc.aprendizado[0];
  // Card nunca revisado está vencido por definição: é a primeira vez que aparece.
  if (!ap) return { ...identidade, due: true, ...NEW_CARD_SCHEDULE };
  return { ...identidade, due: ap.proximaRevisao <= new Date(), ...toSchedule(ap) };
}

// Read-model adapter: looks up a single card's study status for a user.
@Injectable()
export class PrismaStudyFlashcardQuery implements StudyFlashcardQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findForStudy(userId: string, flashcardId: string): Promise<FlashcardStudyView | null> {
    const fc = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, usuarioId: userId },
      include: {
        conceito: { select: { nome: true } },
        aprendizado: { where: { usuarioId: userId } },
      },
    });
    return fc ? toStudyView(fc) : null;
  }
}
