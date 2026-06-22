import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  StudySessionLifecycle,
  StudySessionSummary,
} from '../../domain/ports/study-session-lifecycle';

// Adapter for session lifecycle operations (end/finalize). Not transactional —
// each operation is a single statement.
@Injectable()
export class PrismaStudySessionLifecycle implements StudySessionLifecycle {
  constructor(private readonly prisma: PrismaService) {}

  async findSummary(userId: string, sessionId: string): Promise<StudySessionSummary | null> {
    const session = await this.prisma.sessaoEstudo.findFirst({
      where: { id: sessionId, usuarioId: userId },
      select: { id: true, dataFim: true, _count: { select: { revisoes: true } } },
    });
    return session
      ? { id: session.id, endedAt: session.dataFim, reviewCount: session._count.revisoes }
      : null;
  }

  async end(userId: string, sessionId: string): Promise<void> {
    await this.prisma.sessaoEstudo.updateMany({
      where: { id: sessionId, usuarioId: userId },
      data: { dataFim: new Date() },
    });
  }

  async delete(sessionId: string): Promise<void> {
    await this.prisma.sessaoEstudo.delete({ where: { id: sessionId } });
  }
}
