import type { VaultStudyReview, VaultStudySyncRequest, VaultStudySyncResponse } from "@contracts/vault-study-sync";
import type { LocalSession, LocalSrsLog } from "@/lib/srs-local";

export interface VaultSyncSelection {
  deckIds: Set<string>;
  cardIds: Set<string>;
  downloadedCursors?: Map<string, string>;
}

function supportedSession(session: LocalSession, deckIds: Set<string>): boolean {
  return Boolean(!session.syncedAt && session.endedAt && (session.catalog || deckIds.has(session.baralhoId ?? "")));
}

function localReviewId(sessionId: string, index: number): string {
  return `${sessionId}:${index}`;
}

/** Returns pending reviews for cards belonging to the selected server decks.
 * @example const pending = pendingVaultReviews(log, selection)
 */
export function pendingVaultReviews(log: LocalSrsLog, selection: VaultSyncSelection): VaultStudyReview[] {
  return log.sessions.filter((session) => supportedSession(session, selection.deckIds))
    .flatMap((session) => session.revisoes.flatMap((review, index): VaultStudyReview[] => {
      if (review.serverConfirmed || !selection.cardIds.has(review.flashcardId)) return [];
      return [{
        id: localReviewId(session.id, index), sessionId: session.id, flashcardId: review.flashcardId,
        grade: review.grade, responseTimeMs: review.tempoResposta, reviewedAt: review.revisadoEm,
        startedAt: session.startedAt, endedAt: session.endedAt!,
      }];
    }))
    .sort((left, right) => Date.parse(left.reviewedAt) - Date.parse(right.reviewedAt));
}

/** Groups outgoing reviews and schedule cursors within the server's batch limits.
 * @example const batches = vaultStudySyncBatches(log, selection)
 */
export function vaultStudySyncBatches(log: LocalSrsLog, selection: VaultSyncSelection): VaultStudySyncRequest[] {
  const reviews = pendingVaultReviews(log, selection);
  const cards = [...selection.cardIds].map((id) => ({
    id, knownReviewedAt: log.schedule[id]?.ultimaRevisao ?? selection.downloadedCursors?.get(id) ?? null,
  }));
  const batches = Math.max(Math.ceil(reviews.length / 100), Math.ceil(cards.length / 500));
  return Array.from({ length: batches }, (_, index) => ({
    reviews: reviews.slice(index * 100, (index + 1) * 100),
    cards: cards.slice(index * 500, (index + 1) * 500),
  }));
}

function confirmVaultReviews(log: LocalSrsLog, sent: VaultStudySyncRequest, result: VaultStudySyncResponse): number {
  const sentIds = new Set(sent.reviews.map((review) => review.id));
  const confirmed = new Set(result.confirmedReviewIds.filter((id) => sentIds.has(id)));
  for (const session of log.sessions) {
    session.revisoes.forEach((review, index) => {
      if (confirmed.has(localReviewId(session.id, index))) review.serverConfirmed = true;
    });
  }
  return confirmed.size;
}

function cardsWithPendingReviews(log: LocalSrsLog, selection: VaultSyncSelection): Set<string> {
  const sessions = log.sessions.filter((session) =>
    !session.syncedAt && (session.catalog || selection.deckIds.has(session.baralhoId ?? "")));
  return new Set(sessions.flatMap((session) => session.revisoes)
    .filter((review) => !review.serverConfirmed)
    .map((review) => review.flashcardId));
}

/** Applies only acknowledged reviews and preserves any newer local schedule.
 * @example applyVaultStudySync(log, selection, sent, response)
 */
export function applyVaultStudySync(
  log: LocalSrsLog, selection: VaultSyncSelection, sent: VaultStudySyncRequest, result: VaultStudySyncResponse,
): { confirmed: number; updated: number } {
  const confirmed = confirmVaultReviews(log, sent, result);
  let updated = 0;
  const pending = cardsWithPendingReviews(log, selection);
  for (const { id, schedule } of result.changedSchedules) {
    if (!selection.cardIds.has(id) || pending.has(id)) continue;
    const current = log.schedule[id];
    if (!current || Date.parse(schedule.ultimaRevisao) >= Date.parse(current.ultimaRevisao)) {
      log.schedule[id] = schedule;
      updated += 1;
    }
  }
  return { confirmed, updated };
}
