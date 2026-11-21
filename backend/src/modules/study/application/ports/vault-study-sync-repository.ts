import type {
  VaultStudyReview,
  VaultStudySyncRequest,
  VaultStudySyncResponse,
} from '../../../../../../contracts/vault-study-sync';

export interface VaultStudySyncRepository {
  commit(userId: string, review: VaultStudyReview): Promise<boolean>;
  changedSchedules(
    userId: string,
    cards: VaultStudySyncRequest['cards'],
    force: readonly string[],
  ): Promise<VaultStudySyncResponse['changedSchedules']>;
}
