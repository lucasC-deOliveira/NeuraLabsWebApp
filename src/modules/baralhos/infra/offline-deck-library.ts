import { authApi, getOfflineAccountScope } from "@/lib/api";
import { downloadOfflineDeck } from "../application/offline-deck-library";
import type { BaralhoDetail } from "../domain/baralho.types";
import { remoteBaralhos } from "./http";
import { IndexedDbOfflineDeckStore } from "./indexed-db-offline-decks";

export { getOfflineAccountScope };

/** Downloads a fresh snapshot after confirming the current account online.
 * @example await saveBaralhoForOffline(baralhoId)
 */
export async function saveBaralhoForOffline(baralhoId: string): Promise<void> {
  await authApi.me();
  await downloadOfflineDeck(
    new IndexedDbOfflineDeckStore(window.indexedDB),
    () => remoteBaralhos.getBaralho(baralhoId),
    getOfflineAccountScope,
  );
}

/** Opens the downloaded library without making an HTTP request.
 * @example const decks = await readOfflineBaralhos()
 */
export async function readOfflineBaralhos(): Promise<BaralhoDetail[]> {
  const scope = getOfflineAccountScope();
  if (!scope) return [];
  const store = new IndexedDbOfflineDeckStore(window.indexedDB);
  const decks = await store.list(scope);
  return scope === getOfflineAccountScope() ? decks : [];
}
