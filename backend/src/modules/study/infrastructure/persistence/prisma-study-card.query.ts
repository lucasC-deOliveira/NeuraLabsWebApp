import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { StudyCardQuery, StudyCardView } from '../../domain/ports/study-card-query';

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
    return records.map(
      (r): StudyCardView => ({
        id: r.flashcard.id,
        pergunta: r.flashcard.pergunta,
        resposta: r.flashcard.resposta,
        conceito: r.flashcard.conceito?.nome ?? null,
        fase: r.fase,
        learningStep: r.learningStep,
      }),
    );
  }

  async findNewCards(userId: string, limit: number): Promise<StudyCardView[]> {
    const records = await this.prisma.flashcard.findMany({
      where: { usuarioId: userId, aprendizado: { none: {} } },
      include: { conceito: { select: { nome: true } } },
      take: limit,
    });
    return records.map(
      (fc): StudyCardView => ({
        id: fc.id,
        pergunta: fc.pergunta,
        resposta: fc.resposta,
        conceito: fc.conceito?.nome ?? null,
        fase: 'LEARN',
        learningStep: 0,
      }),
    );
  }
}
