import type { Prisma } from '@prisma/client';
import { StudySession } from '../../domain/entities/study-session';
import type { StudySessionRepository } from '../../domain/ports/study-session-repository';

// Transactional adapter for the StudySession aggregate. Bound to one
// Prisma.TransactionClient so it shares the unit of work's transaction.
export class PrismaStudySessionRepository implements StudySessionRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async start(userId: string): Promise<StudySession> {
    const row = await this.tx.sessaoEstudo.create({
      data: { usuarioId: userId },
      select: { id: true, usuarioId: true },
    });
    return StudySession.create({ id: row.id, userId: row.usuarioId });
  }

  async findActive(userId: string, sessionId?: string): Promise<StudySession | null> {
    const row = await this.tx.sessaoEstudo.findFirst({
      where: sessionId
        ? { id: sessionId, usuarioId: userId }
        : { usuarioId: userId, dataFim: null },
      orderBy: { dataInicio: 'desc' },
      select: { id: true, usuarioId: true },
    });
    return row ? StudySession.create({ id: row.id, userId: row.usuarioId }) : null;
  }

  async save(session: StudySession): Promise<void> {
    for (const review of session.reviews) {
      await this.tx.revisaoFlashcard.create({
        data: {
          flashcardId: review.flashcardId,
          sessaoId: session.id,
          respostaUsuario: review.answer,
          acertou: review.correct,
          nivelConfianca: review.confidence,
          tempoResposta: review.responseTimeMs,
        },
      });
    }
  }
}
