import { describe, expect, it } from 'vitest';
import type { VaultStudyReview } from '../../../../../../contracts/vault-study-sync';
import { SyncVaultStudyUseCase } from './sync-vault-study.use-case';
import type { VaultStudySyncRepository } from '../ports/vault-study-sync-repository';

class FakeVaultStudySyncRepository implements VaultStudySyncRepository {
  readonly committed: VaultStudyReview[] = [];
  changedIds: readonly string[] = [];

  async commit(_userId: string, review: VaultStudyReview): Promise<boolean> {
    if (review.flashcardId === 'missing') return false;
    if (!this.committed.some((entry) => entry.id === review.id)) this.committed.push(review);
    return true;
  }

  async changedSchedules(_userId: string, _cards: unknown, force: readonly string[]): Promise<[]> {
    this.changedIds = force;
    return [];
  }
}

const review: VaultStudyReview = {
  id: 'review',
  sessionId: 'session',
  flashcardId: 'card',
  grade: 'good',
  startedAt: '2026-01-01T12:00:00Z',
  reviewedAt: '2026-01-01T12:01:00Z',
  endedAt: '2026-01-01T12:02:00Z',
  responseTimeMs: 1000,
};

describe('SyncVaultStudyUseCase', () => {
  it('confirms committed and retried reviews without acknowledging unavailable cards', async () => {
    const repo = new FakeVaultStudySyncRepository();
    const useCase = new SyncVaultStudyUseCase(repo);
    const input = {
      cards: [],
      reviews: [review, { ...review, id: 'unavailable', flashcardId: 'missing' }],
    };
    expect((await useCase.execute('owner', input)).confirmedReviewIds).toEqual(['review']);
    expect((await useCase.execute('owner', input)).confirmedReviewIds).toEqual(['review']);
    expect(repo.committed).toEqual([review]);
    expect(repo.changedIds).toEqual(['card']);
  });
});
