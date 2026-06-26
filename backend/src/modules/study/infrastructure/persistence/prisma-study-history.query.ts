import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { StudyHistoryQuery } from '../../domain/ports/study-history-query';
import type { StudySessionSummary } from '../../domain/study-views';
import { summarizeSession, type RawSession } from '../../domain/summarize-session';

const RECENT = 20;
const SELECT = {
  id: true,
  dataInicio: true,
  dataFim: true,
  _count: { select: { revisoes: true } },
  revisoes: { select: { acertou: true, nivelConfianca: true } },
} as const;

type Row = Prisma.SessaoEstudoGetPayload<{ select: typeof SELECT }>;

const toRaw = (s: Row): RawSession => ({
  id: s.id,
  dataInicio: s.dataInicio,
  dataFim: s.dataFim,
  totalReviews: s._count.revisoes,
  reviews: s.revisoes,
});

@Injectable()
export class PrismaStudyHistoryQuery implements StudyHistoryQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listHistory(userId: string): Promise<StudySessionSummary[]> {
    const sessions = await this.prisma.sessaoEstudo.findMany({
      where: { usuarioId: userId },
      select: SELECT,
      orderBy: { dataInicio: 'desc' },
      take: RECENT,
    });
    return sessions.map((s) => summarizeSession(toRaw(s)));
  }
}
