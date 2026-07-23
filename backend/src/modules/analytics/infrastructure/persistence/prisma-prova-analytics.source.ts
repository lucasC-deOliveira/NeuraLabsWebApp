import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  AttemptRow,
  ProvaAnalyticsSource,
  QuestionStatRow,
} from '../../domain/ports/prova-analytics-source';

interface QuestaoCount {
  questaoId: string;
  _count: { _all: number };
}

// Read-model adapter: lê as tentativas de prova e as estatísticas por questão.
@Injectable()
export class PrismaProvaAnalyticsSource implements ProvaAnalyticsSource {
  constructor(private readonly prisma: PrismaService) {}

  async attempts(userId: string, since: Date): Promise<AttemptRow[]> {
    const rows = await this.prisma.tentativaProva.findMany({
      where: { usuarioId: userId, dataFim: { gte: since } },
      select: {
        provaId: true,
        dataFim: true,
        acertos: true,
        total: true,
        prova: { select: { titulo: true } },
      },
      orderBy: { dataFim: 'asc' },
    });
    return rows.map((r) => ({
      provaId: r.provaId,
      titulo: r.prova.titulo,
      dataFim: r.dataFim,
      acertos: r.acertos,
      total: r.total,
    }));
  }

  async questionStats(userId: string, since: Date): Promise<QuestionStatRow[]> {
    const where = { tentativa: { usuarioId: userId, dataFim: { gte: since } } };
    const [totals, wrongs] = await Promise.all([
      this.prisma.respostaQuestao.groupBy({ by: ['questaoId'], where, _count: { _all: true } }),
      this.prisma.respostaQuestao.groupBy({
        by: ['questaoId'],
        where: { ...where, acertou: false },
        _count: { _all: true },
      }),
    ]);
    return this.withQuestao(totals, wrongs);
  }

  private async withQuestao(
    totals: QuestaoCount[],
    wrongs: QuestaoCount[],
  ): Promise<QuestionStatRow[]> {
    const wrong = new Map(wrongs.map((w) => [w.questaoId, w._count._all]));
    const questoes = await this.prisma.questao.findMany({
      where: { id: { in: totals.map((t) => t.questaoId) } },
      select: { id: true, enunciado: true, tipo: true },
    });
    const meta = new Map(questoes.map((q) => [q.id, q]));
    return totals.map((t) => ({
      enunciado: meta.get(t.questaoId)?.enunciado ?? '',
      tipo: meta.get(t.questaoId)?.tipo ?? '',
      total: t._count._all,
      wrong: wrong.get(t.questaoId) ?? 0,
    }));
  }
}
