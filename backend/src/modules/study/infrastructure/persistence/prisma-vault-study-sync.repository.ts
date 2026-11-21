import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma, type AprendizadoFlashcard } from '@prisma/client';
import type {
  VaultStudyReview,
  VaultStudySyncRequest,
  VaultStudySyncResponse,
} from '../../../../../../contracts/vault-study-sync';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { VaultStudySyncRepository } from '../../application/ports/vault-study-sync-repository';
import { Grade } from '../../domain/value-objects/grade';
import { Phase } from '../../domain/value-objects/phase';
import { PrismaFlashcardRepository } from './prisma-flashcard.repository';

function scopedKey(kind: string, userId: string, clientId: string): string {
  const digest = createHash('sha256')
    .update(JSON.stringify([userId, clientId]))
    .digest('hex');
  return `vault-${kind}-${digest}`;
}

async function recordVaultReview(
  tx: Prisma.TransactionClient,
  userId: string,
  review: VaultStudyReview,
  grade: Grade,
): Promise<'saved' | 'replayed' | 'conflict'> {
  const id = scopedKey('review', userId, review.id);
  const sessaoId = scopedKey('session', userId, review.sessionId);
  const existing = await tx.revisaoFlashcard.findUnique({ where: { id } });
  if (existing) {
    return existing.flashcardId === review.flashcardId && existing.sessaoId === sessaoId
      ? 'replayed'
      : 'conflict';
  }
  await ensureVaultStudySession(tx, sessaoId, userId, review);
  await tx.revisaoFlashcard.create({ data: vaultReviewColumns(id, sessaoId, review, grade) });
  return 'saved';
}

function vaultReviewColumns(
  id: string,
  sessaoId: string,
  review: VaultStudyReview,
  grade: Grade,
): Prisma.RevisaoFlashcardUncheckedCreateInput {
  return {
    id,
    sessaoId,
    flashcardId: review.flashcardId,
    acertou: grade.correct,
    nivelConfianca: grade.confidence,
    tempoResposta: review.responseTimeMs,
  };
}

async function ensureVaultStudySession(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
  review: VaultStudyReview,
): Promise<void> {
  await tx.sessaoEstudo.upsert({
    where: { id },
    create: {
      id,
      usuarioId: userId,
      dataInicio: new Date(review.startedAt),
      dataFim: new Date(review.endedAt),
    },
    update: {},
  });
}

function toSchedule(row: AprendizadoFlashcard): VaultStudySyncResponse['changedSchedules'][number] {
  return {
    id: row.flashcardId,
    schedule: {
      fase: Phase.create(row.fase).value,
      dificuldade: row.dificuldade,
      intervalo: row.intervalo,
      fatorEase: row.fatorEase,
      learningStep: row.learningStep,
      ultimaRevisao: row.ultimaRevisao.toISOString(),
      proximaRevisao: row.proximaRevisao.toISOString(),
    },
  };
}

function isUnseenSchedule(row: AprendizadoFlashcard, knownAt: string | null): boolean {
  return knownAt === null || row.ultimaRevisao.getTime() > Date.parse(knownAt);
}

@Injectable()
export class PrismaVaultStudySyncRepository implements VaultStudySyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async commit(userId: string, review: VaultStudyReview): Promise<boolean> {
    return this.prisma.$transaction(
      async (tx) => {
        const cards = new PrismaFlashcardRepository(tx);
        const card = await cards.findOwnedBy(review.flashcardId, userId);
        if (!card) return false;
        const grade = Grade.create(review.grade);
        const outcome = await recordVaultReview(tx, userId, review, grade);
        if (outcome === 'conflict') return false;
        if (outcome === 'saved' && card.reviewAt(grade, new Date(review.reviewedAt))) {
          await cards.save(card);
        }
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async changedSchedules(
    userId: string,
    cards: VaultStudySyncRequest['cards'],
    force: readonly string[],
  ): Promise<VaultStudySyncResponse['changedSchedules']> {
    const known = new Map(cards.map((card) => [card.id, card.knownReviewedAt]));
    const forced = new Set(force);
    const ids = [...new Set([...known.keys(), ...forced])];
    if (!ids.length) return [];
    const rows = await this.prisma.aprendizadoFlashcard.findMany({
      where: { usuarioId: userId, flashcardId: { in: ids }, flashcard: { usuarioId: userId } },
    });
    return rows
      .filter(
        (row) =>
          forced.has(row.flashcardId) || isUnseenSchedule(row, known.get(row.flashcardId) ?? null),
      )
      .map(toSchedule);
  }
}
