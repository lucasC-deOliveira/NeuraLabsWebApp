import { describe, expect, it } from 'vitest';
import type { VaultStudyReview } from '../../../../../../contracts/vault-study-sync';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaVaultStudySyncRepository } from './prisma-vault-study-sync.repository';

describe('PrismaVaultStudySyncRepository', () => {
  it('commits once, scopes reads by owner, and returns only changed schedules', async () => {
    const prisma = new PrismaService();
    const users: string[] = [];
    try {
      for (const name of ['Owner', 'Other']) {
        const user = await prisma.usuario.create({
          data: { nome: name, email: `${crypto.randomUUID()}@example.com`, senhaHash: 'fixture' },
        });
        users.push(user.id);
      }
      const [owner, other] = users;
      const card = await prisma.flashcard.create({
        data: { usuarioId: owner, pergunta: 'Question', resposta: 'Answer' },
      });
      const repo = new PrismaVaultStudySyncRepository(prisma);
      const review: VaultStudyReview = {
        id: 'local-session:0',
        sessionId: 'local-session',
        flashcardId: card.id,
        grade: 'good',
        responseTimeMs: 250,
        startedAt: '2026-01-01T12:00:00.000Z',
        reviewedAt: '2026-01-01T12:01:00.000Z',
        endedAt: '2026-01-01T12:02:00.000Z',
      };
      await expect(repo.commit(other, review)).resolves.toBe(false);
      await expect(repo.commit(owner, review)).resolves.toBe(true);
      await expect(repo.commit(owner, review)).resolves.toBe(true);
      expect(await prisma.revisaoFlashcard.count({ where: { flashcardId: card.id } })).toBe(1);
      const request = [{ id: card.id, knownReviewedAt: null }];
      await expect(repo.changedSchedules(other, request, [])).resolves.toEqual([]);
      const [entry] = await repo.changedSchedules(owner, request, []);
      expect(entry.schedule.ultimaRevisao).toBe(review.reviewedAt);
      const seen = [{ id: card.id, knownReviewedAt: review.reviewedAt }];
      await expect(repo.changedSchedules(owner, seen, [])).resolves.toEqual([]);
      await expect(repo.changedSchedules(owner, seen, [card.id])).resolves.toEqual([entry]);
    } finally {
      try {
        await prisma.usuario.deleteMany({ where: { id: { in: users } } });
      } finally {
        await prisma.$disconnect();
      }
    }
  });
});
