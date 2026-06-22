import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { dbToState, type ScheduleState } from '../../domain/services/spaced-repetition';
import type {
  ReviewRecord,
  SessionRef,
  StudyRepository,
  StudyTxRepository,
} from '../../domain/ports/study-repository';

interface AprendizadoData {
  dificuldade: number;
  intervalo: number;
  fatorEase: number;
  fase: string;
  learningStep: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
  estagioAprendizado: number;
}

// Maps domain state to AprendizadoFlashcard columns (includes the legacy
// estagioAprendizado field, derived from the phase).
function toAprendizadoData(state: ScheduleState): AprendizadoData {
  return {
    dificuldade: state.dificuldade,
    intervalo: state.intervalo,
    fatorEase: state.fatorEase,
    fase: state.fase,
    learningStep: state.learningStep,
    proximaRevisao: state.proximaRevisao,
    ultimaRevisao: state.ultimaRevisao,
    estagioAprendizado: state.fase === 'REVIEW' ? 5 : 0,
  };
}

// Transactional adapter: all operations use the same Prisma.TransactionClient.
class PrismaStudyTx implements StudyTxRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async isCardOwnedBy(flashcardId: string, userId: string): Promise<boolean> {
    const card = await this.tx.flashcard.findFirst({
      where: { id: flashcardId, usuarioId: userId },
      select: { usuarioId: true },
    });
    return card !== null;
  }

  async getLearningState(flashcardId: string, userId: string): Promise<ScheduleState | null> {
    const ap = await this.tx.aprendizadoFlashcard.findFirst({
      where: { flashcardId, usuarioId: userId },
    });
    return ap ? dbToState(ap) : null;
  }

  async createReview(review: ReviewRecord): Promise<void> {
    await this.tx.revisaoFlashcard.create({ data: { ...review } });
  }

  async saveLearningState(
    flashcardId: string,
    userId: string,
    state: ScheduleState,
  ): Promise<void> {
    const data = toAprendizadoData(state);
    await this.tx.aprendizadoFlashcard.upsert({
      where: { flashcardId_usuarioId: { flashcardId, usuarioId: userId } },
      create: { flashcardId, usuarioId: userId, ...data },
      update: data,
    });
  }
}

@Injectable()
export class PrismaStudyRepository implements StudyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveSession(userId: string, sessaoId?: string): Promise<SessionRef | null> {
    return this.prisma.sessaoEstudo.findFirst({
      where: sessaoId ? { id: sessaoId, usuarioId: userId } : { usuarioId: userId, dataFim: null },
      orderBy: { dataInicio: 'desc' },
      select: { id: true },
    });
  }

  async withTransaction<T>(work: (tx: StudyTxRepository) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => work(new PrismaStudyTx(tx)));
  }
}
