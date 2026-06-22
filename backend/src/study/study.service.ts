import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { applyInterleaving } from '../modules/study/domain/services/interleaving';
import {
  scheduleCard,
  dbToState,
  gradeFromLegacy,
  type ReviewGrade,
} from '../modules/study/domain/services/spaced-repetition';

interface VaultRevisao {
  flashcardId: string;
  grade?: ReviewGrade;
  // campos legados (antes do 4-botões)
  acertou?: boolean;
  nivelConfianca?: number;
  tempoResposta: number;
  revisadoEm: string;
}

interface VaultSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  baralhoId: string | null;
  revisoes: VaultRevisao[];
}

const MAX_NEW = 10;
const MAX_CARDS = 30;

export interface StudyCard {
  id: string;
  pergunta: string;
  resposta: string;
  conceito: string | null;
  fase?: string;
  learningStep?: number;
}

@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  private async dueCards(userId: string): Promise<StudyCard[]> {
    const now = new Date();
    const records = await this.prisma.aprendizadoFlashcard.findMany({
      where: { usuarioId: userId, proximaRevisao: { lte: now } },
      include: { flashcard: { include: { conceito: true } } },
      orderBy: [{ fase: 'asc' }, { proximaRevisao: 'asc' }],
    });
    return records.map((r: any) => ({
      id: r.flashcard.id,
      pergunta: r.flashcard.pergunta,
      resposta: r.flashcard.resposta,
      conceito: r.flashcard.conceito?.nome ?? null,
      fase: r.fase,
      learningStep: r.learningStep,
    }));
  }

  private async newCards(userId: string, limit = MAX_NEW): Promise<StudyCard[]> {
    const records = await this.prisma.flashcard.findMany({
      where: { usuarioId: userId, aprendizado: { none: {} } },
      include: { conceito: { select: { nome: true } } },
      take: limit,
    });
    return records.map((fc: any) => ({
      id: fc.id, pergunta: fc.pergunta, resposta: fc.resposta,
      conceito: fc.conceito?.nome ?? null, fase: 'LEARN', learningStep: 0,
    }));
  }

  async startSession(userId: string): Promise<{ sessionId: string; cards: StudyCard[] }> {
    const session = await this.prisma.sessaoEstudo.create({ data: { usuarioId: userId }, select: { id: true } });
    const [due, fresh] = await Promise.all([this.dueCards(userId), this.newCards(userId)]);
    const cards = applyInterleaving([...due, ...fresh].slice(0, MAX_CARDS));
    return { sessionId: session.id, cards };
  }

  async endSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    await this.prisma.sessaoEstudo.updateMany({ where: { id: sessionId, usuarioId: userId }, data: { dataFim: new Date() } });
    return { success: true };
  }

  async startDeckStudy(userId: string, baralhoId: string) {
    const baralho = await this.prisma.baralho.findFirst({
      where: { id: baralhoId, usuarioId: userId },
      include: { flashcards: { include: { conceito: { select: { nome: true } }, aprendizado: { where: { usuarioId: userId } } }, orderBy: { dataCriacao: 'asc' } } },
    });
    if (!baralho) return null;
    const now = new Date();
    const due = baralho.flashcards.filter((fc: any) => {
      const ap = fc.aprendizado[0];
      return !ap || ap.proximaRevisao <= now;
    });
    const cards: StudyCard[] = due.map((fc: any) => ({
      id: fc.id, pergunta: fc.pergunta, resposta: fc.resposta,
      conceito: fc.conceito?.nome ?? null,
      fase: fc.aprendizado[0]?.fase ?? 'LEARN',
      learningStep: fc.aprendizado[0]?.learningStep ?? 0,
    }));
    const session = await this.prisma.sessaoEstudo.create({ data: { usuarioId: userId }, select: { id: true } });
    return { sessionId: session.id, titulo: baralho.titulo, cards, totalNoDeck: baralho.flashcards.length };
  }

  async getFlashcardForStudy(userId: string, flashcardId: string) {
    const fc = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, usuarioId: userId },
      include: { conceito: { select: { nome: true } }, aprendizado: { where: { usuarioId: userId } } },
    });
    if (!fc) return null;
    const ap = fc.aprendizado[0];
    return {
      id: fc.id, pergunta: fc.pergunta, resposta: fc.resposta,
      conceito: fc.conceito?.nome ?? null,
      due: !ap || ap.proximaRevisao <= new Date(),
      proximaRevisao: ap ? ap.proximaRevisao.toISOString() : null,
      fase: ap?.fase ?? 'LEARN',
    };
  }

  async startSingleCardStudy(userId: string, flashcardId: string) {
    const fc = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, usuarioId: userId },
      include: { conceito: { select: { nome: true } }, aprendizado: { where: { usuarioId: userId } } },
    });
    if (!fc) return null;
    const ap = fc.aprendizado[0];
    const due = !ap || ap.proximaRevisao <= new Date();
    const sessionId = due
      ? (await this.prisma.sessaoEstudo.create({ data: { usuarioId: userId }, select: { id: true } })).id
      : null;
    return {
      sessionId,
      card: { id: fc.id, pergunta: fc.pergunta, resposta: fc.resposta, conceito: fc.conceito?.nome ?? null },
      due,
      proximaRevisao: ap ? ap.proximaRevisao.toISOString() : null,
      fase: ap?.fase ?? 'LEARN',
    };
  }

  async finalizeSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    const session = await this.prisma.sessaoEstudo.findFirst({
      where: { id: sessionId, usuarioId: userId },
      select: { id: true, dataFim: true, _count: { select: { revisoes: true } } },
    });
    if (!session) return { success: false };
    if (session._count.revisoes === 0) await this.prisma.sessaoEstudo.delete({ where: { id: sessionId } });
    else if (!session.dataFim) await this.prisma.sessaoEstudo.update({ where: { id: sessionId }, data: { dataFim: new Date() } });
    return { success: true };
  }

  async syncVaultLog(userId: string, sessions: VaultSession[]): Promise<{ synced: number }> {
    const sorted = [...sessions].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    let synced = 0;
    for (const session of sorted) {
      if (!session.revisoes?.length) continue;
      try {
        const dbSession = await this.prisma.sessaoEstudo.create({
          data: {
            usuarioId: userId,
            dataInicio: new Date(session.startedAt),
            dataFim: session.endedAt ? new Date(session.endedAt) : new Date(),
          },
          select: { id: true },
        });

        const revisoes = [...session.revisoes].sort((a, b) => a.revisadoEm.localeCompare(b.revisadoEm));
        for (const r of revisoes) {
          const grade: ReviewGrade = r.grade ?? gradeFromLegacy(r.acertou ?? false, r.nivelConfianca ?? 0);
          const revisadoEm = new Date(r.revisadoEm);
          try {
            await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              const fc = await tx.flashcard.findFirst({ where: { id: r.flashcardId, usuarioId: userId }, select: { id: true } });
              if (!fc) return;

              await tx.revisaoFlashcard.create({
                data: {
                  flashcardId: r.flashcardId, sessaoId: dbSession.id,
                  respostaUsuario: '', acertou: grade !== 'again',
                  nivelConfianca: { again: 0, hard: 2, good: 4, easy: 5 }[grade],
                  tempoResposta: r.tempoResposta,
                },
              });

              const existing = await tx.aprendizadoFlashcard.findFirst({ where: { flashcardId: r.flashcardId, usuarioId: userId } });
              // só atualiza se esta revisão é posterior à última registrada
              if (existing && revisadoEm < existing.ultimaRevisao) return;

              const newState = scheduleCard(grade, existing ? dbToState(existing) : null, revisadoEm);
              if (!existing) {
                await tx.aprendizadoFlashcard.create({
                  data: {
                    flashcardId: r.flashcardId, usuarioId: userId,
                    dificuldade: newState.dificuldade, intervalo: newState.intervalo,
                    fatorEase: newState.fatorEase, fase: newState.fase,
                    learningStep: newState.learningStep,
                    proximaRevisao: newState.proximaRevisao, ultimaRevisao: newState.ultimaRevisao,
                    estagioAprendizado: newState.fase === 'REVIEW' ? 5 : 0,
                  },
                });
              } else {
                await tx.aprendizadoFlashcard.update({
                  where: { flashcardId_usuarioId: { flashcardId: r.flashcardId, usuarioId: userId } },
                  data: {
                    dificuldade: newState.dificuldade, intervalo: newState.intervalo,
                    fatorEase: newState.fatorEase, fase: newState.fase,
                    learningStep: newState.learningStep,
                    proximaRevisao: newState.proximaRevisao, ultimaRevisao: newState.ultimaRevisao,
                    estagioAprendizado: newState.fase === 'REVIEW' ? 5 : 0,
                  },
                });
              }
            });
          } catch { /* revisão individual falhou — continua */ }
        }
        synced++;
      } catch { /* sessão falhou — continua */ }
    }
    return { synced };
  }

  async submitReview(
    userId: string,
    data: {
      flashcardId: string; respostaUsuario: string;
      grade?: ReviewGrade;
      // campos legados (compatibilidade)
      acertou?: boolean; nivelConfianca?: number;
      tempoResposta?: number; sessaoId?: string;
    },
  ): Promise<{ success: boolean }> {
    const session = await this.prisma.sessaoEstudo.findFirst({
      where: data.sessaoId ? { id: data.sessaoId, usuarioId: userId } : { usuarioId: userId, dataFim: null },
      orderBy: { dataInicio: 'desc' },
      select: { id: true },
    });
    if (!session) throw new BadRequestException('Nenhuma sessão de estudo ativa.');

    const grade: ReviewGrade = data.grade ?? gradeFromLegacy(data.acertou ?? false, data.nivelConfianca ?? 0);
    const now = new Date();

    await this.prisma.$transaction(async (tx: any) => {
      const fc = await tx.flashcard.findFirst({ where: { id: data.flashcardId, usuarioId: userId }, select: { usuarioId: true } });
      if (!fc) throw new BadRequestException('Flashcard não encontrado');

      await tx.revisaoFlashcard.create({
        data: {
          flashcardId: data.flashcardId, sessaoId: session.id,
          respostaUsuario: data.respostaUsuario ?? '',
          acertou: grade !== 'again',
          nivelConfianca: { again: 0, hard: 2, good: 4, easy: 5 }[grade],
          tempoResposta: data.tempoResposta,
        },
      });

      const existing = await tx.aprendizadoFlashcard.findFirst({ where: { flashcardId: data.flashcardId, usuarioId: userId } });
      const newState = scheduleCard(grade, existing ? dbToState(existing) : null, now);

      if (!existing) {
        await tx.aprendizadoFlashcard.create({
          data: {
            flashcardId: data.flashcardId, usuarioId: userId,
            dificuldade: newState.dificuldade, intervalo: newState.intervalo,
            fatorEase: newState.fatorEase, fase: newState.fase,
            learningStep: newState.learningStep,
            proximaRevisao: newState.proximaRevisao, ultimaRevisao: newState.ultimaRevisao,
            estagioAprendizado: newState.fase === 'REVIEW' ? 5 : 0,
          },
        });
      } else {
        await tx.aprendizadoFlashcard.update({
          where: { flashcardId_usuarioId: { flashcardId: data.flashcardId, usuarioId: userId } },
          data: {
            dificuldade: newState.dificuldade, intervalo: newState.intervalo,
            fatorEase: newState.fatorEase, fase: newState.fase,
            learningStep: newState.learningStep,
            proximaRevisao: newState.proximaRevisao, ultimaRevisao: newState.ultimaRevisao,
            estagioAprendizado: newState.fase === 'REVIEW' ? 5 : 0,
          },
        });
      }
    });
    return { success: true };
  }
}
