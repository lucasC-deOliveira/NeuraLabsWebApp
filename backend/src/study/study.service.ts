import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

  async startDeckStudy(userId: string, baralhoId: string) {
    const baralho = await this.prisma.baralho.findFirst({
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
    if (!baralho) return null;
    const now = new Date();
    const due = baralho.flashcards.filter((fc: any) => {
      const ap = fc.aprendizado[0];
      return !ap || ap.proximaRevisao <= now;
    });
    const cards: StudyCard[] = due.map((fc: any) => ({
      id: fc.id,
      pergunta: fc.pergunta,
      resposta: fc.resposta,
      conceito: fc.conceito?.nome ?? null,
      fase: fc.aprendizado[0]?.fase ?? 'LEARN',
      learningStep: fc.aprendizado[0]?.learningStep ?? 0,
    }));
    const session = await this.prisma.sessaoEstudo.create({
      data: { usuarioId: userId },
      select: { id: true },
    });
    return {
      sessionId: session.id,
      titulo: baralho.titulo,
      cards,
      totalNoDeck: baralho.flashcards.length,
    };
  }

  async getFlashcardForStudy(userId: string, flashcardId: string) {
    const fc = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, usuarioId: userId },
      include: {
        conceito: { select: { nome: true } },
        aprendizado: { where: { usuarioId: userId } },
      },
    });
    if (!fc) return null;
    const ap = fc.aprendizado[0];
    return {
      id: fc.id,
      pergunta: fc.pergunta,
      resposta: fc.resposta,
      conceito: fc.conceito?.nome ?? null,
      due: !ap || ap.proximaRevisao <= new Date(),
      proximaRevisao: ap ? ap.proximaRevisao.toISOString() : null,
      fase: ap?.fase ?? 'LEARN',
    };
  }

  async startSingleCardStudy(userId: string, flashcardId: string) {
    const fc = await this.prisma.flashcard.findFirst({
      where: { id: flashcardId, usuarioId: userId },
      include: {
        conceito: { select: { nome: true } },
        aprendizado: { where: { usuarioId: userId } },
      },
    });
    if (!fc) return null;
    const ap = fc.aprendizado[0];
    const due = !ap || ap.proximaRevisao <= new Date();
    const sessionId = due
      ? (
          await this.prisma.sessaoEstudo.create({
            data: { usuarioId: userId },
            select: { id: true },
          })
        ).id
      : null;
    return {
      sessionId,
      card: {
        id: fc.id,
        pergunta: fc.pergunta,
        resposta: fc.resposta,
        conceito: fc.conceito?.nome ?? null,
      },
      due,
      proximaRevisao: ap ? ap.proximaRevisao.toISOString() : null,
      fase: ap?.fase ?? 'LEARN',
    };
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

        const revisoes = [...session.revisoes].sort((a, b) =>
          a.revisadoEm.localeCompare(b.revisadoEm),
        );
        for (const r of revisoes) {
          const grade: ReviewGrade =
            r.grade ?? gradeFromLegacy(r.acertou ?? false, r.nivelConfianca ?? 0);
          const revisadoEm = new Date(r.revisadoEm);
          try {
            await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              const fc = await tx.flashcard.findFirst({
                where: { id: r.flashcardId, usuarioId: userId },
                select: { id: true },
              });
              if (!fc) return;

              await tx.revisaoFlashcard.create({
                data: {
                  flashcardId: r.flashcardId,
                  sessaoId: dbSession.id,
                  respostaUsuario: '',
                  acertou: grade !== 'again',
                  nivelConfianca: { again: 0, hard: 2, good: 4, easy: 5 }[grade],
                  tempoResposta: r.tempoResposta,
                },
              });

              const existing = await tx.aprendizadoFlashcard.findFirst({
                where: { flashcardId: r.flashcardId, usuarioId: userId },
              });
              // só atualiza se esta revisão é posterior à última registrada
              if (existing && revisadoEm < existing.ultimaRevisao) return;

              const newState = scheduleCard(
                grade,
                existing ? dbToState(existing) : null,
                revisadoEm,
              );
              if (!existing) {
                await tx.aprendizadoFlashcard.create({
                  data: {
                    flashcardId: r.flashcardId,
                    usuarioId: userId,
                    dificuldade: newState.dificuldade,
                    intervalo: newState.intervalo,
                    fatorEase: newState.fatorEase,
                    fase: newState.fase,
                    learningStep: newState.learningStep,
                    proximaRevisao: newState.proximaRevisao,
                    ultimaRevisao: newState.ultimaRevisao,
                    estagioAprendizado: newState.fase === 'REVIEW' ? 5 : 0,
                  },
                });
              } else {
                await tx.aprendizadoFlashcard.update({
                  where: {
                    flashcardId_usuarioId: { flashcardId: r.flashcardId, usuarioId: userId },
                  },
                  data: {
                    dificuldade: newState.dificuldade,
                    intervalo: newState.intervalo,
                    fatorEase: newState.fatorEase,
                    fase: newState.fase,
                    learningStep: newState.learningStep,
                    proximaRevisao: newState.proximaRevisao,
                    ultimaRevisao: newState.ultimaRevisao,
                    estagioAprendizado: newState.fase === 'REVIEW' ? 5 : 0,
                  },
                });
              }
            });
          } catch {
            /* revisão individual falhou — continua */
          }
        }
        synced++;
      } catch {
        /* sessão falhou — continua */
      }
    }
    return { synced };
  }
}
