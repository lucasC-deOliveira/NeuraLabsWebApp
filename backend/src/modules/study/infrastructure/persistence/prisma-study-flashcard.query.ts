import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  FlashcardStudyView,
  StudyFlashcardQuery,
} from '../../domain/ports/study-flashcard-query';

interface FlashcardWithLearning {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: { nome: string } | null;
  aprendizado: { proximaRevisao: Date; fase: string }[];
}

function toStudyView(fc: FlashcardWithLearning): FlashcardStudyView {
  const aprendizado = fc.aprendizado[0];
  return {
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    conceito: fc.conceito?.nome ?? null,
    due: !aprendizado || aprendizado.proximaRevisao <= new Date(),
    proximaRevisao: aprendizado ? aprendizado.proximaRevisao.toISOString() : null,
    fase: aprendizado?.fase ?? 'LEARN',
  };
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
