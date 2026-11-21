import type { VaultStudySyncResponse } from "@contracts/vault-study-sync";
import { getOfflineAccountId, resolveApiUrl } from "@/lib/api";
import { readSrsLog, type LocalSrsLog } from "@/lib/srs-local";
import { pendingVaultReviews, vaultStudySyncBatches, type VaultSyncSelection } from "../application/vault-study-sync";
import type { VaultDeck } from "../domain/vault-library";
import { linkVaultStudyDeck, runVaultStudySync, selectedVaultDecks, type VaultStudySyncSummary } from "./configured-vault-study-sync";
import { configuredStudyVault } from "./electron-vault-study";
import { syncVaultStudyBatch } from "./vault-study-sync-api";

interface StudyNoticeDetails {
  folder: string;
  fingerprint: string;
  count: number;
}

interface StudyNoticeScope {
  folder: string;
  accountId: string;
  serverUrl: string;
}

export type VaultStudyNotice = StudyNoticeDetails & (
  | { kind: "local-reviews" | "server-schedules" }
  | { kind: "unlinked-reviews"; deckId: string; accountId: string; serverUrl: string }
);

/** Probes server schedules without including local reviews in the request.
 * @example const changes = await probeVaultSchedules(log, selected)
 */
export async function probeVaultSchedules(
  log: LocalSrsLog, selected: VaultSyncSelection, request: typeof syncVaultStudyBatch = syncVaultStudyBatch,
): Promise<VaultStudySyncResponse["changedSchedules"]> {
  const changes: VaultStudySyncResponse["changedSchedules"] = [];
  for (const { cards } of vaultStudySyncBatches(log, selected)) {
    if (!cards.length) continue;
    const response = await request({ cards, reviews: [] }, 5_000);
    changes.push(...response.changedSchedules.filter((entry) => selected.cardIds.has(entry.id)));
  }
  return changes;
}

/** Reads pending changes for the current vault and locally verified account.
 * @example const notice = await readVaultStudyNotice(true)
 */
export async function readVaultStudyNotice(probeServer: boolean): Promise<VaultStudyNotice | null> {
  const store = await configuredStudyVault();
  const accountId = getOfflineAccountId();
  if (!store || !accountId) return null;
  const library = await store.read();
  if (!library.syncEnabled || library.syncPromptEnabled === false) return null;
  const serverUrl = resolveApiUrl();
  const selected = selectedVaultDecks(library, { accountId, serverUrl });
  const log = await readSrsLog(store.folder);
  const scope = { folder: store.folder, accountId, serverUrl };
  if (!isCurrentNoticeAccount(accountId, serverUrl)) return null;
  const pending = pendingLocalStudyNotice(log, selected, library.decks, scope);
  if (pending) return pending;
  if (!probeServer || !selected.cardIds.size) return null;
  const changes = await probeVaultSchedules(log, selected);
  if (!isCurrentNoticeAccount(accountId, serverUrl)) return null;
  return makeStudyNotice(scope, "server-schedules", changes.map(({ id, schedule }) => `${id}:${schedule.ultimaRevisao}`));
}

function canOfferDeckLink(deck: VaultDeck, scope: StudyNoticeScope): boolean {
  if (deck.sync) return false;
  if (deck.downloadedFrom) {
    return deck.downloadedFrom.accountId === scope.accountId && deck.downloadedFrom.serverUrl === scope.serverUrl;
  }
  // Copies made before source metadata retained Prisma CUIDs. Vault-native decks use UUIDs.
  return /^c[0-9a-z]{24}$/i.test(deck.id);
}

/** Finds ready reviews or offers to link a downloaded deck before sending them.
 * @example const notice = pendingLocalStudyNotice(log, selected, decks, scope)
 */
export function pendingLocalStudyNotice(
  log: LocalSrsLog, selected: VaultSyncSelection, decks: VaultDeck[], scope: StudyNoticeScope,
): VaultStudyNotice | null {
  const pending = pendingVaultReviews(log, selected);
  if (pending.length) return makeStudyNotice(scope, "local-reviews", pending.map((review) => review.id));
  for (const deck of decks) {
    if (!canOfferDeckLink(deck, scope)) continue;
    const reviewIds = pendingVaultReviews(log, {
      deckIds: new Set([deck.id]), cardIds: new Set(deck.cards.map((card) => card.id)),
    }).map((review) => review.id);
    const notice = makeStudyNotice(scope, "local-reviews", reviewIds);
    if (!notice) continue;
    return {
      ...notice, ...scope, kind: "unlinked-reviews", deckId: deck.id,
      fingerprint: JSON.stringify([notice.fingerprint, "unlinked", deck.id]),
    };
  }
  return null;
}

/** Links an unconfigured download only after the user confirms the popup action.
 * @example const result = await synchronizeVaultStudyNotice(notice)
 */
export async function synchronizeVaultStudyNotice(notice: VaultStudyNotice): Promise<VaultStudySyncSummary> {
  if (notice.kind === "unlinked-reviews") {
    if (!isCurrentNoticeAccount(notice.accountId, notice.serverUrl)) {
      throw new Error("Server account changed. Expected: the signed-in account that received the notice");
    }
    await linkVaultStudyDeck(notice.folder, notice.deckId, true);
  }
  return runVaultStudySync(notice.folder);
}

function isCurrentNoticeAccount(accountId: string, serverUrl: string): boolean {
  return accountId === getOfflineAccountId() && serverUrl === resolveApiUrl();
}

function makeStudyNotice(
  scope: StudyNoticeScope, kind: "local-reviews" | "server-schedules", keys: string[],
): VaultStudyNotice | null {
  if (!keys.length) return null;
  return { folder: scope.folder, kind, count: keys.length, fingerprint: JSON.stringify([scope, kind, keys.sort()]) };
}
