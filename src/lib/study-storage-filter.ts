export type StorageFilter = "all" | "vault" | "server";

interface StoredStudyRecord {
  storage?: "vault";
  availableOnServer?: boolean;
}

/** Filters by where a study record is available, including downloaded records in either view.
 * @example recordsInStorage(decks, "vault")
 */
export function recordsInStorage<RecordType extends StoredStudyRecord>(
  records: RecordType[], filter: StorageFilter,
): RecordType[] {
  if (filter === "all") return records;
  if (filter === "vault") return records.filter((record) => record.storage === "vault");
  return records.filter((record) => record.storage !== "vault" || record.availableOnServer === true);
}
