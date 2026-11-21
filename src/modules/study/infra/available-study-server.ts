import { getToken } from "@/lib/api";

const SERVER_READ_BUDGET_MS = 3_000;

/** Gives the optional server read a short window without blocking local operations indefinitely.
 * @example const decks = await availableStudyServer(() => server.listBaralhos(), [])
 */
export async function availableStudyServer<Result>(
  load: () => Promise<Result>, fallback: Result, session: () => string | null = getToken,
): Promise<Result> {
  const token = session();
  if (!token) return fallback;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<Result>((resolve) => { timer = setTimeout(resolve, SERVER_READ_BUDGET_MS, fallback); });
    const value = await Promise.race([load(), deadline]);
    return session() === token ? value : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** Keeps the vault copy when a record exists in both stores.
 * @example const decks = mergeStudyRecords(localDecks, serverDecks)
 */
export function mergeStudyRecords<RecordType extends { id: string }>(
  local: RecordType[], server: RecordType[],
): Array<RecordType & { availableOnServer?: boolean }> {
  const ids = new Set(local.map((record) => record.id));
  const serverIds = new Set(server.map((record) => record.id));
  return [
    ...local.map((record) => ({ ...record, availableOnServer: serverIds.has(record.id) })),
    ...server.filter((record) => !ids.has(record.id)),
  ];
}
