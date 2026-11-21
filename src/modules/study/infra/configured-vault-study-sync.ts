import { authApi, getToken, resolveApiUrl } from "@/lib/api";
import { getBaralho } from "@/lib/baralhos-api";
import { readSrsLog, updateSrsLog } from "@/lib/srs-local";
import { announceVaultStudyChange } from "@/lib/vault-study-events";
import { applyVaultStudySync, pendingVaultReviews, vaultStudySyncBatches, type VaultSyncSelection } from "../application/vault-study-sync";
import type { VaultLibrary } from "../domain/vault-library";
import { ElectronVaultStudyStore } from "./electron-vault-study";
import { syncVaultStudyBatch } from "./vault-study-sync-api";

interface VaultSyncAccount {
  accountId: string;
  serverUrl: string;
  token: string;
}

export interface VaultStudySyncSettings {
  enabled: boolean;
  promptEnabled: boolean;
  decks: Array<{ id: string; title: string; linked: boolean }>;
}

async function verifiedVaultSyncAccount(): Promise<VaultSyncAccount> {
  const token = getToken();
  const serverUrl = resolveApiUrl();
  if (!token) throw new Error("Missing sync session. Expected: a server login");
  const user = await authApi.me();
  if (!user?.id || token !== getToken() || serverUrl !== resolveApiUrl()) {
    throw new Error("Unverified sync session. Expected: the original signed-in account");
  }
  return { accountId: user.id, serverUrl, token };
}

function assertVaultSyncAccount(account: VaultSyncAccount): void {
  if (getToken() !== account.token || resolveApiUrl() !== account.serverUrl) {
    throw new Error("Sync session changed. Expected: the original signed-in account and server");
  }
}

export function selectedVaultDecks(
  library: VaultLibrary, account: Pick<VaultSyncAccount, "accountId" | "serverUrl">,
): VaultSyncSelection {
  const decks = library.decks.filter((deck) =>
    deck.sync?.accountId === account.accountId && deck.sync.serverUrl === account.serverUrl);
  const downloadedCursors = new Map(decks.flatMap((deck) => deck.cards.flatMap((card) =>
    card.schedule ? [[card.id, card.schedule.ultimaRevisao] as const] : [])));
  return {
    deckIds: new Set(decks.map((deck) => deck.id)),
    cardIds: new Set(decks.flatMap((deck) => deck.sync?.cardIds ?? [])),
    downloadedCursors,
  };
}

/** Opens the manual sync preferences stored in the chosen vault.
 * @example const preferences = await readVaultStudySyncSettings(folder)
 */
export async function readVaultStudySyncSettings(folder: string): Promise<VaultStudySyncSettings> {
  const library = await new ElectronVaultStudyStore(folder).read();
  return {
    enabled: library.syncEnabled === true,
    promptEnabled: library.syncPromptEnabled !== false,
    decks: library.decks.map((deck) => ({ id: deck.id, title: deck.title, linked: Boolean(deck.sync) })),
  };
}

/** Changes whether this vault allows manual server sync.
 * @example await setVaultStudySyncEnabled(folder, true)
 */
export async function setVaultStudySyncEnabled(folder: string, enabled: boolean): Promise<void> {
  await new ElectronVaultStudyStore(folder).update((library) => ({ ...library, syncEnabled: enabled }));
  announceVaultStudyChange("settings");
}

/** Saves the independent preference for showing the global sync notice.
 * @example await setVaultStudySyncPromptEnabled(folder, false)
 */
export async function setVaultStudySyncPromptEnabled(folder: string, enabled: boolean): Promise<void> {
  await new ElectronVaultStudyStore(folder).update((library) => ({ ...library, syncPromptEnabled: enabled }));
  announceVaultStudyChange("settings");
}

/** Verifies that the selected deck belongs to the signed-in server account before linking it.
 * @example await linkVaultStudyDeck(folder, deckId, true)
 */
export async function linkVaultStudyDeck(folder: string, id: string, link: boolean): Promise<void> {
  const store = new ElectronVaultStudyStore(folder);
  const sync = link ? await verifyServerDeck(id) : undefined;
  await store.update((library) => {
    if (!library.decks.some((deck) => deck.id === id)) {
      throw new Error(`Missing vault deck "${id}". Expected: a downloaded deck in this vault`);
    }
    const decks = library.decks.map((deck) => deck.id === id ? { ...deck, sync } : deck);
    return { ...library, decks };
  });
  announceVaultStudyChange("settings");
}

async function verifyServerDeck(id: string): Promise<NonNullable<VaultLibrary["decks"][number]["sync"]>> {
  const account = await verifiedVaultSyncAccount();
  const deck = await getBaralho(id);
  assertVaultSyncAccount(account);
  return { accountId: account.accountId, serverUrl: account.serverUrl, cardIds: deck.cards.map((card) => card.id) };
}

export interface VaultStudySyncSummary {
  confirmed: number;
  pending: number;
  updated: number;
}

/** Exchanges only pending reviews and changed schedules for linked decks.
 * @example const summary = await runVaultStudySync(folder)
 */
export async function runVaultStudySync(folder: string): Promise<VaultStudySyncSummary> {
  const library = await new ElectronVaultStudyStore(folder).read();
  if (!library.syncEnabled) throw new Error("Sync is disabled. Expected: an enabled vault setting");
  const account = await verifiedVaultSyncAccount();
  const selection = selectedVaultDecks(library, account);
  if (!selection.deckIds.size) throw new Error("No decks linked. Expected: a deck linked to this account");
  const summary = await exchangeVaultStudyBatches(folder, selection, account);
  announceVaultStudyChange("synchronized");
  return summary;
}

async function exchangeVaultStudyBatches(
  folder: string, selection: VaultSyncSelection, account: VaultSyncAccount,
): Promise<VaultStudySyncSummary> {
  const batches = vaultStudySyncBatches(await readSrsLog(folder), selection);
  let confirmed = 0;
  let updated = 0;
  for (const batch of batches) {
    assertVaultSyncAccount(account);
    const response = await syncVaultStudyBatch(batch);
    assertVaultSyncAccount(account);
    const applied = await updateSrsLog(folder, (log) => applyVaultStudySync(log, selection, batch, response),
      (result) => result.confirmed > 0 || result.updated > 0);
    confirmed += applied.confirmed;
    updated += applied.updated;
  }
  const pending = pendingVaultReviews(await readSrsLog(folder), selection).length;
  return { confirmed, pending, updated };
}
