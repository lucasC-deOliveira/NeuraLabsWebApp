import type {
  VaultStudySyncRequest,
  VaultStudySyncResponse,
} from '../../../../../../contracts/vault-study-sync';
import type { VaultStudySyncRepository } from '../ports/vault-study-sync-repository';

export class SyncVaultStudyUseCase {
  constructor(private readonly repository: VaultStudySyncRepository) {}

  /**
   * Confirms durable reviews and returns schedules changed since the caller's last view.
   * @example sync.execute(userId, { reviews: [], cards: [{ id: cardId, knownReviewedAt: null }] })
   */
  async execute(userId: string, input: VaultStudySyncRequest): Promise<VaultStudySyncResponse> {
    const ordered = [...input.reviews].sort(
      (left, right) => Date.parse(left.reviewedAt) - Date.parse(right.reviewedAt),
    );
    const confirmedReviewIds: string[] = [];
    const touchedCards = new Set<string>();
    for (const review of ordered) {
      if (!(await this.repository.commit(userId, review))) continue;
      confirmedReviewIds.push(review.id);
      touchedCards.add(review.flashcardId);
    }
    const changedSchedules = await this.repository.changedSchedules(userId, input.cards, [
      ...touchedCards,
    ]);
    return { confirmedReviewIds, changedSchedules };
  }
}
