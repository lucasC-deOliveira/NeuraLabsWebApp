import type { OfflineDeckStore } from "../application/offline-deck-library";
import type { BaralhoDetail } from "../domain/baralho.types";

const STORE = "decks";
const SCOPE_INDEX = "scope";

interface OfflineDeckRecord {
  scope: string;
  deck: BaralhoDetail;
}

function openOfflineDatabase(indexedDb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject): void => {
    const request = indexedDb.open("neuralabs-offline-library", 1);
    request.onupgradeneeded = (): void => {
      const store = request.result.createObjectStore(STORE, { keyPath: ["scope", "deck.id"] });
      store.createIndex(SCOPE_INDEX, "scope");
    };
    request.onerror = (): void => reject(request.error);
    request.onsuccess = (): void => resolve(request.result);
  });
}

function committedDeckOperation<Result>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<Result>,
): Promise<Result> {
  return new Promise((resolve, reject): void => {
    const transaction = database.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    // A successful request may still roll back before the transaction commits.
    transaction.oncomplete = (): void => resolve(request.result);
    transaction.onabort = (): void => reject(transaction.error ?? request.error);
  });
}

export class IndexedDbOfflineDeckStore implements OfflineDeckStore {
  constructor(private readonly indexedDb: IDBFactory) {}

  /** Saves the entire deck and review state in one committed record.
   * @example await store.save(accountScope, deck)
   */
  async save(scope: string, deck: BaralhoDetail): Promise<void> {
    const database = await openOfflineDatabase(this.indexedDb);
    try {
      const record: OfflineDeckRecord = { scope, deck };
      await committedDeckOperation(database, "readwrite", (store) => store.put(record));
    } finally {
      database.close();
    }
  }

  /** Reads only the snapshots assigned to the active account and server.
   * @example const decks = await store.list(accountScope)
   */
  async list(scope: string): Promise<BaralhoDetail[]> {
    const database = await openOfflineDatabase(this.indexedDb);
    try {
      const records = await committedDeckOperation<OfflineDeckRecord[]>(database, "readonly", (store) =>
        store.index(SCOPE_INDEX).getAll(IDBKeyRange.only(scope)),
      );
      return records.map((record) => record.deck);
    } finally {
      database.close();
    }
  }
}
