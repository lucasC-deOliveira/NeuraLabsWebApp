import { describe, expect, it } from "vitest";
import { recordsInStorage } from "./study-storage-filter";

describe("recordsInStorage", () => {
  it("shows the downloaded record in both views and preserves the combined list", () => {
    const records = [
      { id: "offline", storage: "vault" as const },
      { id: "downloaded", storage: "vault" as const, availableOnServer: true },
      { id: "remote", storage: undefined },
    ];
    expect(recordsInStorage(records, "all")).toEqual(records);
    expect(recordsInStorage(records, "vault").map((record) => record.id)).toEqual(["offline", "downloaded"]);
    expect(recordsInStorage(records, "server").map((record) => record.id)).toEqual(["downloaded", "remote"]);
  });
});
